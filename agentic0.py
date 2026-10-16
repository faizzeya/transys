import os
from langchain.llms import OpenAI
from langchain.agents import AgentType, initialize_agent
from langchain.tools import Tool
from langchain.utilities import SerpAPIWrapper
from langchain.tools.python.tool import PythonREPLTool

# Set your OpenAI API key
os.environ["OPENAI_API_KEY"] = "your-openai-api-key"

# Set your SerpAPI key for web search
os.environ["SERPAPI_API_KEY"] = "your-serpapi-key"

# Initialize LLM
llm = OpenAI(model_name="gpt-4-turbo", temperature=0.5)

# Web search tool
search = SerpAPIWrapper()
search_tool = Tool(
    name="Web Search",
    func=search.run,
    description="Search the web for real-time information. Use this when answering questions that require current events."
)

# Python execution tool
python_tool = PythonREPLTool()

# Define agent tools
tools = [search_tool, python_tool]

# Initialize the agent
agent = initialize_agent(
    tools=tools,
    llm=llm,
    agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    verbose=True
)

# Run the agent
def run_agent():
    print("Agentic AI is running. Type 'exit' to stop.")
    while True:
        query = input("User: ")
        if query.lower() == "exit":
            print("Goodbye!")
            break
        response = agent.run(query)
        print("AI:", response)

if __name__ == "__main__":
    run_agent()
