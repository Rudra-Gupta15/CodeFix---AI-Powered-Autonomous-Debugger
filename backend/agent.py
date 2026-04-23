import os
import json
from openai import OpenAI
from dotenv import load_dotenv
from sandbox import execute_python_code
from analysis import run_pylint

load_dotenv()

class DebuggingAgent:
    def __init__(self, model="gpt-4o"):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = model
        self.tools = [
            {
                "type": "function",
                "function": {
                    "name": "code_executor",
                    "description": "Executes Python code and returns the console output and errors.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "code": {"type": "string", "description": "The Python code to run."}
                        },
                        "required": ["code"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "static_analyzer",
                    "description": "Runs Pylint on the code and returns a list of potential issues.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "code": {"type": "string", "description": "The Python code to analyze."}
                        },
                        "required": ["code"],
                    },
                },
            }
        ]

    def invoke(self, input_data):
        code = input_data.get("input", "")
        messages = [
            {"role": "system", "content": """You are a professional Autonomous Code Debugging Agent.
            Your goal is to find and fix bugs in Python code provided by the user.

            Strategy:
            1. Use 'static_analyzer' to find obvious syntax or linting errors.
            2. Use 'code_executor' to see the exact runtime error if it's not clear.
            3. Synthesize the results and provide a fix.

            Final Answer Format (Must be a JSON object):
            {
              "explanation": "Brief description of the bug and fix",
              "fixed_code": "The COMPLETE corrected code block",
              "errors": [{"line": 1, "type": "SyntaxError", "message": "description", "fix": "fix suggestion"}]
            }
            """},
            {"role": "user", "content": code}
        ]

        # Max 5 iterations to avoid infinite loops
        for _ in range(5):
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=self.tools,
                tool_choice="auto"
            )

            response_message = response.choices[0].message

            # BUG FIX 1: Convert Pydantic model to dict before appending to messages list.
            # The OpenAI API expects plain dicts, not ChatCompletionMessage objects.
            messages.append(response_message.model_dump(exclude_unset=True))

            if not response_message.tool_calls:
                # Agent has finished its reasoning.
                # BUG FIX 3: response_message.content can be None when tool calls were
                # present in a previous turn. Guard with a fallback string.
                content = response_message.content or "No response generated."
                return {"output": content}

            for tool_call in response_message.tool_calls:
                function_name = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments)

                print(f"Agent calling tool: {function_name}")

                if function_name == "code_executor":
                    result = execute_python_code(function_args.get("code"))
                elif function_name == "static_analyzer":
                    result = run_pylint(function_args.get("code"))
                else:
                    result = "Unknown tool"

                # BUG FIX 2: Removed the deprecated "name" field from tool response messages.
                # The current OpenAI API spec only requires role, tool_call_id, and content.
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result),
                })

        return {"output": "Agent failed to converge after 5 iterations."}


def get_debug_agent():
    return DebuggingAgent()
