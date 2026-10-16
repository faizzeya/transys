import ollama

MODEL = "deepseek-r1:7b"

# Ask for the role (system prompt) once at the start
role = input("Enter role for DeepSeek R1 (e.g. 'a Python tutor', press Enter for default): ").strip()
if not role:
    role = "a helpful assistant"

messages = [{"role": "system", "content": f"You are {role}."}]

while True:
    q = input("\nEnter question to DeepSeek R1: ").strip()
    if not q:
        continue

    messages.append({"role": "user", "content": q})
    response = ollama.chat(model=MODEL, messages=messages)
    answer = response["message"]["content"]
    print("\n" + answer)
    messages.append({"role": "assistant", "content": answer})

    # Ask whether to terminate after each answer
    stop = input("\nDo you want to terminate the program? (y/n): ").strip().lower()
    if stop in ("y", "yes"):
        break

print("GoodBye")
