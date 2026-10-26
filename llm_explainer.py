"""
LLM Explainer by Transys
========================
An interactive app that opens up a real large language model (GPT-2)
so you can see how it reads text, predicts the next word, writes,
pays attention, and represents meaning.

Install (once):
    pip install torch transformers gradio matplotlib

Run:
    python llm_explainer.py               # small, fast model (distilgpt2, ~350 MB)
    python llm_explainer.py --model gpt2  # full GPT-2 small (~550 MB)

Your browser opens automatically. The model downloads the first time only.
Everything runs on your own computer; no API key needed.

(c) Transys - https://faizzeya.github.io/transys/
"""

import argparse
from functools import lru_cache

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import torch
import gradio as gr
from transformers import AutoModelForCausalLM, AutoTokenizer

MODEL_NAME = "distilgpt2"

# Newer Gradio can hide the inline labels and show only a colour legend.
import inspect
LEGEND_ONLY = ({"show_inline_category": False}
               if "show_inline_category" in inspect.signature(gr.HighlightedText).parameters else {})


# ----------------------------------------------------------------- model
@lru_cache(maxsize=1)
def load():
    print(f"Loading {MODEL_NAME} (first run downloads it)...")
    tok = AutoTokenizer.from_pretrained(MODEL_NAME)
    try:
        model = AutoModelForCausalLM.from_pretrained(MODEL_NAME, attn_implementation="eager")
    except TypeError:
        model = AutoModelForCausalLM.from_pretrained(MODEL_NAME)
    model.eval()
    return tok, model


def show(t):
    """Make a token readable: show leading spaces and newlines."""
    t = t.replace("\n", "\\n")
    return "·" + t[1:] if t.startswith(" ") else t


def style(fig):
    fig.patch.set_facecolor("white")
    fig.tight_layout()
    return fig


# ------------------------------------------------------- 1. tokenization
def tokenize(text):
    tok, _ = load()
    ids = tok(text)["input_ids"]
    pieces = [(show(tok.decode([i])), f"#{i}") for i in ids]
    words = len(text.split())
    stats = (f"**{len(text)}** characters · **{words}** words · **{len(ids)}** tokens · "
             f"**{len(text) / max(len(ids), 1):.1f}** characters per token")
    table = [[n + 1, show(tok.decode([i])), i] for n, i in enumerate(ids)]
    return pieces, stats, table


# -------------------------------------------------- 2. next-token prediction
@torch.no_grad()
def next_token_probs(prompt, temperature):
    tok, model = load()
    ids = tok(prompt, return_tensors="pt")["input_ids"]
    if ids.shape[1] == 0:
        return {}, "Type a prompt first."
    logits = model(ids).logits[0, -1]
    probs = torch.softmax(logits / max(temperature, 1e-3), dim=-1)
    top = torch.topk(probs, 15)
    result = {f"{show(tok.decode([int(i)]))}": float(p) for p, i in zip(top.values, top.indices)}
    best = tok.decode([int(top.indices[0])])
    note = (f"The model scored all **{probs.numel():,}** tokens in its vocabulary. "
            f"Its top choice is **'{best.strip()}'** with **{float(top.values[0]) * 100:.1f}%**. "
            f"The top 15 together cover **{float(top.values.sum()) * 100:.1f}%** of the probability.")
    return result, note


# ------------------------------------------------ 3. step-by-step writing
@torch.no_grad()
def generate(prompt, steps, temperature, top_k, top_p, seed):
    tok, model = load()
    ids = tok(prompt, return_tensors="pt")["input_ids"]
    if ids.shape[1] == 0:
        return [], [], "Type a prompt first."
    g = torch.Generator().manual_seed(int(seed))
    out = [(prompt, None)]
    rows = []
    for step in range(int(steps)):
        logits = model(ids).logits[0, -1] / max(temperature, 1e-3)
        probs_full = torch.softmax(logits, dim=-1)
        # top-k filter
        if top_k > 0:
            kth = torch.topk(logits, int(top_k)).values[-1]
            logits = torch.where(logits < kth, torch.tensor(float("-inf")), logits)
        # top-p (nucleus) filter
        if top_p < 1.0:
            sl, si = torch.sort(logits, descending=True)
            cum = torch.cumsum(torch.softmax(sl, dim=-1), dim=-1)
            remove = cum - torch.softmax(sl, dim=-1) > top_p
            logits[si[remove]] = float("-inf")
        probs = torch.softmax(logits, dim=-1)
        nxt = int(torch.multinomial(probs, 1, generator=g))
        p = float(probs_full[nxt])
        alts = torch.topk(probs_full, 3)
        alt_txt = ", ".join(f"'{show(tok.decode([int(i)]))}' {float(v) * 100:.0f}%"
                            for v, i in zip(alts.values, alts.indices))
        piece = tok.decode([nxt])
        label = "likely (>40%)" if p > 0.4 else "possible (10-40%)" if p > 0.1 else "surprising (<10%)"
        out.append((piece, label))
        rows.append([step + 1, show(piece), f"{p * 100:.1f}%", alt_txt])
        ids = torch.cat([ids, torch.tensor([[nxt]])], dim=1)
    n_s = sum(1 for _, l in out[1:] if l and l.startswith("surprising"))
    note = (f"Wrote **{int(steps)}** tokens, one at a time. Each step fed everything so far back into the model. "
            f"**{n_s}** picks were 'surprising' — raise the temperature for more, lower it for fewer.")
    return out, rows, note


# ------------------------------------------------------------ 4. attention
@torch.no_grad()
def attention(prompt, layer, head):
    tok, model = load()
    ids = tok(prompt, return_tensors="pt")["input_ids"][:, :40]
    if ids.shape[1] < 2:
        return None, "Type at least two words."
    att = model(ids, output_attentions=True).attentions
    n_layers, n_heads = len(att), att[0].shape[1]
    layer = min(int(layer), n_layers) - 1
    labels = [show(tok.decode([int(i)])) for i in ids[0]]
    if head == "average":
        a = att[layer][0].mean(0).numpy()
        title = f"Layer {layer + 1}, average of all {n_heads} heads"
    else:
        h = min(int(head), n_heads) - 1
        a = att[layer][0, h].numpy()
        title = f"Layer {layer + 1}, head {h + 1}"
    n = len(labels)
    fig, ax = plt.subplots(figsize=(min(2 + n * 0.45, 13), min(2 + n * 0.4, 11)))
    ax.imshow(a, cmap="viridis", vmin=0)
    ax.set_xticks(range(n), labels, rotation=60, ha="right", fontsize=9)
    ax.set_yticks(range(n), labels, fontsize=9)
    ax.set_xlabel("...is looking at this token")
    ax.set_ylabel("This token...")
    ax.set_title(title)
    last = a[-1].copy()
    last[-1] = 0
    sink = float(a[1:, 0].mean()) * 100
    last[0] = 0
    j = int(last.argmax())
    note = (f"This model has **{n_layers} layers × {n_heads} heads** = {n_layers * n_heads} attention patterns. "
            f"Bright squares show where each token looks. Notice the grid is a triangle: "
            f"a token can only look backwards, never at future words. "
            f"Tokens here spend about **{sink:.0f}%** of their attention on the first token, a 'resting place' "
            f"real LLMs use when nothing else matters. Apart from that, the last token **'{labels[-1]}'** "
            f"looks most at **'{labels[j]}'**.")
    return style(fig), note


# ----------------------------------------------------------- 5. embeddings
@torch.no_grad()
def embeddings(word_text):
    tok, model = load()
    words = [w.strip() for w in word_text.replace("\n", ",").split(",") if w.strip()][:25]
    if len(words) < 3:
        return None, None, "Enter at least three words, separated by commas."
    W = model.get_input_embeddings().weight
    vecs = torch.stack([W[tok(" " + w)["input_ids"]].mean(0) for w in words]).numpy()
    nv = vecs / np.linalg.norm(vecs, axis=1, keepdims=True)
    sim = nv @ nv.T

    fig1, ax = plt.subplots(figsize=(7, 6))
    im = ax.imshow(sim, cmap="magma", vmin=sim.min(), vmax=1)
    ax.set_xticks(range(len(words)), words, rotation=60, ha="right")
    ax.set_yticks(range(len(words)), words)
    ax.set_title("Cosine similarity between word vectors")
    fig1.colorbar(im, ax=ax, fraction=0.046)

    c = vecs - vecs.mean(0)
    u, s, vt = np.linalg.svd(c, full_matrices=False)
    xy = c @ vt[:2].T
    fig2, ax2 = plt.subplots(figsize=(7, 6))
    ax2.scatter(xy[:, 0], xy[:, 1], s=40, color="#14b8a6")
    for (x, y), w in zip(xy, words):
        ax2.annotate(w, (x, y), xytext=(5, 4), textcoords="offset points", fontsize=11)
    ax2.set_title(f"{W.shape[1]} dimensions squashed to 2 (PCA)")
    ax2.set_xticks([]); ax2.set_yticks([])
    ax2.margins(0.18)

    np.fill_diagonal(sim, -1)
    i, j = np.unravel_index(sim.argmax(), sim.shape)
    note = (f"Each word is a list of **{W.shape[1]} numbers** inside the model. "
            f"The most similar pair here is **{words[i]}** and **{words[j]}** "
            f"(similarity {sim[i, j]:.2f}).")
    return style(fig1), style(fig2), note


# ------------------------------------------------------------------- UI
INTRO = """
# 🧠 LLM Explainer
### Look inside a real large language model, by Transys
A **large language model (LLM)** like ChatGPT does one thing over and over: **predict the next token**.
This app runs a real one (GPT-2) on your computer so you can watch each step. Work through the tabs in order.
"""

HOW = """
## The whole picture in 5 steps
1. **Tokenize**: your text is cut into tokens, and each becomes an ID number.
2. **Embed**: each ID is swapped for a long list of numbers (a vector) that captures its meaning.
3. **Attend**: in each layer, every token looks back at earlier tokens to gather context ("it" looks at "cat").
4. **Predict**: the last layer gives a probability for every token in the vocabulary.
5. **Sample & repeat**: one token is picked, added to the text, and the whole process runs again.

ChatGPT, Claude and Gemini work the same way, just with far more layers, far more training data, and extra training
to follow instructions. GPT-2 (2019) has ~124 million parameters; modern models have hundreds of billions.

## Key words
- **Token**: a piece of text, usually a word or part of a word.
- **Parameters / weights**: the numbers the model learned during training.
- **Context window**: how many tokens the model can look at once.
- **Temperature**: how random the next-token pick is. Low = safe, high = creative.
- **Hallucination**: the model predicts text that *sounds* right but isn't true, because it predicts likely words, not facts.

*Made by Transys. Need an AI solution built on your own data? Visit faizzeya.github.io/transys*
"""


def build():
    tok, model = load()
    cfg = model.config
    n_layers = getattr(cfg, "n_layer", None) or getattr(cfg, "num_hidden_layers", 12)
    n_heads = getattr(cfg, "n_head", None) or getattr(cfg, "num_attention_heads", 12)
    n_params = sum(p.numel() for p in model.parameters())

    with gr.Blocks(title="LLM Explainer by Transys") as app:
        gr.Markdown(INTRO)
        gr.Markdown(f"**Loaded model:** `{MODEL_NAME}` · {n_params / 1e6:.0f}M parameters · "
                    f"{n_layers} layers · {n_heads} attention heads · {tok.vocab_size:,}-token vocabulary")

        with gr.Tab("1 · Tokens"):
            gr.Markdown("The model never sees letters. It sees **tokens**. Type anything and watch it split. "
                        "Try a long rare word, an Urdu word, or some code.")
            t_in = gr.Textbox(label="Your text", lines=3,
                              value="Transys builds unbelievable AI tools in Karachi. Tokenization is surprisingly important!")
            t_out = gr.HighlightedText(label="Tokens (hover to see each ID)", show_legend=False, combine_adjacent=False)
            t_stats = gr.Markdown()
            t_tab = gr.Dataframe(headers=["#", "token", "ID"], label="Token IDs the model receives")
            t_in.change(tokenize, t_in, [t_out, t_stats, t_tab])
            app.load(tokenize, t_in, [t_out, t_stats, t_tab])

        with gr.Tab("2 · Next-word prediction"):
            gr.Markdown("Give the model a prompt. It returns a probability for **every** possible next token. "
                        "Here are its top 15 guesses.")
            p_in = gr.Textbox(label="Prompt", value="Once upon a time, there was a")
            p_t = gr.Slider(0.1, 2.0, value=1.0, step=0.1, label="Temperature (reshapes the probabilities)")
            gr.Examples([["Once upon a time, there was a"], ["The capital of France is"],
                         ["My favourite programming language is"], ["2 + 2 ="]], p_in)
            p_out = gr.Label(num_top_classes=15, label="Most likely next tokens")
            p_note = gr.Markdown()
            gr.Markdown("**Notice:** for *The capital of France is*, this small model does not put *Paris* first. "
                        "It predicts likely words, not facts. That is where hallucinations come from.")
            for c in (p_in, p_t):
                c.change(next_token_probs, [p_in, p_t], [p_out, p_note])
            app.load(next_token_probs, [p_in, p_t], [p_out, p_note])

        with gr.Tab("3 · Writing, step by step"):
            gr.Markdown("This is all a chatbot does: predict, pick one token, add it, repeat. "
                        "Colours show how confident the model was about each pick.")
            with gr.Row():
                with gr.Column(scale=2):
                    g_in = gr.Textbox(label="Prompt", lines=2, value="In the future, artificial intelligence will")
                with gr.Column(scale=1):
                    g_n = gr.Slider(5, 60, value=25, step=1, label="Tokens to write")
                    g_seed = gr.Number(value=21, label="Random seed (same seed = same result)", precision=0)
            with gr.Row():
                g_t = gr.Slider(0.1, 2.0, value=0.8, step=0.1, label="Temperature")
                g_k = gr.Slider(0, 100, value=40, step=1, label="Top-k (0 = off)")
                g_p = gr.Slider(0.1, 1.0, value=0.95, step=0.05, label="Top-p / nucleus")
            g_btn = gr.Button("✍️ Write", variant="primary")
            g_out = gr.HighlightedText(label="Generated text", show_legend=True, **LEGEND_ONLY,
                                       color_map={"likely (>40%)": "green", "possible (10-40%)": "yellow",
                                                  "surprising (<10%)": "red"})
            g_note = gr.Markdown()
            g_tab = gr.Dataframe(headers=["step", "picked", "probability", "top 3 alternatives"],
                                 label="What happened at each step")
            g_btn.click(generate, [g_in, g_n, g_t, g_k, g_p, g_seed], [g_out, g_tab, g_note])
            gr.Markdown("**Try:** temperature 0.1 (repetitive and safe) vs 1.8 (creative, then nonsense). "
                        "Set top-k to 1 for greedy decoding with no randomness at all.")

        with gr.Tab("4 · Attention"):
            gr.Markdown("**Attention** is how a token gathers context from earlier tokens. Each layer has several "
                        "**heads**, and each head learns to look for something different.")
            a_in = gr.Textbox(label="Sentence", value="The cat sat on the mat because it was tired")
            with gr.Row():
                a_l = gr.Slider(1, n_layers, value=min(3, n_layers), step=1, label="Layer")
                a_h = gr.Dropdown(["average"] + [str(i) for i in range(1, n_heads + 1)],
                                  value="average", label="Head")
            a_btn = gr.Button("Show attention", variant="primary")
            a_note = gr.Markdown()
            a_plot = gr.Plot()
            a_btn.click(attention, [a_in, a_l, a_h], [a_plot, a_note])
            gr.Markdown("**Try:** look at the row for *it* across different layers and heads. "
                        "Some heads link *it* to *cat*.")

        with gr.Tab("5 · Embeddings"):
            gr.Markdown("Before any attention happens, each token is turned into a vector: a long list of numbers. "
                        "Words used in similar ways get similar vectors.")
            e_in = gr.Textbox(label="Words (comma separated)", lines=2,
                              value="king, queen, man, woman, cat, dog, apple, banana, Python, Java, Monday, Friday")
            e_btn = gr.Button("Compare", variant="primary")
            e_note = gr.Markdown()
            with gr.Row():
                e_p1 = gr.Plot()
                e_p2 = gr.Plot()
            e_btn.click(embeddings, e_in, [e_p1, e_p2, e_note])

        with gr.Tab("6 · How it all fits"):
            gr.Markdown(HOW)
    return app


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Interactive LLM explainer by Transys")
    ap.add_argument("--model", default="distilgpt2",
                    help="Hugging Face causal LM name (distilgpt2, gpt2, gpt2-medium ...)")
    ap.add_argument("--port", type=int, default=7860)
    ap.add_argument("--share", action="store_true", help="Create a temporary public link")
    args = ap.parse_args()
    MODEL_NAME = args.model
    build().launch(server_port=args.port, share=args.share, inbrowser=True)
