"use strict";

const CODEFIX_CONCEPT = {
  version: "1.3.0",
  currentLanguage: "Python",

  languages: {
    python: {
      id:"python", label:"Python", ext:"py", mode:"python", icon:"🐍", version:"3.x",
      pistonId:"python", pistonVersion:"3.10.0",
      defaultCode:`def calculate_average(numbers)
    total = 0
    for num in numbers:
        total += num
    average = total / len(numbers
    return average

scores = [85, 92, 78, 95, 88]
result = calculate_averge(scores)
print("Average score:", reslt)
`,
    },
    javascript: {
      id:"javascript", label:"JavaScript", ext:"js", mode:"javascript", icon:"⚡", version:"ES2022",
      pistonId:"javascript", pistonVersion:"18.15.0",
      defaultCode:`function findMax(arr) {
  let max = arr[0]
  for (let i = 1; i < arr.lenght; i++) {
    if (arr[i] > mx) {
      max = arr[i]
    }
  }
  retun max
}

const numbers = [3, 7, 1, 9, 4]
console.log("Max:", findMax(numbers))
`,
    },
    typescript: {
      id:"typescript", label:"TypeScript", ext:"ts", mode:"javascript", icon:"🔹", version:"5.x",
      pistonId:"typescript", pistonVersion:"5.0.3",
      defaultCode:`function greet(name: string): string {
  return "Hello, " + nam
}

const msg: string = greet("World")
consolelog(msg)
`,
    },
    java: {
      id:"java", label:"Java", ext:"java", mode:{name:"text/x-java"}, icon:"☕", version:"JDK 17",
      pistonId:"java", pistonVersion:"15.0.2",
      defaultCode:`public class Main {
    public static int factorial(int n) {
        if n == 0) return 1;
        return n * factorial(n - 1)
    }

    public static void main(String[] args) {
        System.out.println("5! = " + factorial(5))
        System.out.println("0! = " + Factorial(0));
    }
}
`,
    },
    c: {
      id:"c", label:"C", ext:"c", mode:{name:"text/x-csrc"}, icon:"⚙", version:"C17",
      pistonId:"c", pistonVersion:"10.2.0",
      defaultCode:`#include <stdio.h>

int sum_array(int arr[], int size) {
    int total = 0
    for (int i = 0; i <= size; i++) {
        total += arr[i];
    }
    return total;
}

int main() {
    int numbers[] = {1, 2, 3, 4, 5};
    printf("Sum: %d\\n", sum_array(numbers, 5)
    return 0;
}
`,
    },
    cpp: {
      id:"cpp", label:"C++", ext:"cpp", mode:{name:"text/x-c++src"}, icon:"🔷", version:"C++17",
      pistonId:"c++", pistonVersion:"10.2.0",
      defaultCode:`#include <iostream>
#include <vector>
using namespace std;

int findMin(vector<int>& v) {
    int min = v[0];
    for (int i = 1; i < v.size(); i++) {
        if (v[i] < mn)
            min = v[i];
    }
    reutrn min;
}

int main() {
    vector<int> nums = {5, 3, 8, 1, 9};
    cout << "Min: " << findMin(nums) << end;
    return 0;
}
`,
    },
    go: {
      id:"go", label:"Go", ext:"go", mode:"go", icon:"🔵", version:"1.21",
      pistonId:"go", pistonVersion:"1.16.2",
      defaultCode:`package main

import "fmt"

func sumSlice(nums []int) int {
    total := 0
    for i := 0; i < len(nums); i++
        total += nums[i]
    }
    return total
}

func main() {
    numbers := []int{1, 2, 3, 4, 5}
    fmt.Println("Sum:", sumSlice(numbers)
}
`,
    },
    php: {
      id:"php", label:"PHP", ext:"php", mode:"php", icon:"🐘", version:"8.x",
      pistonId:"php", pistonVersion:"8.2.3",
      defaultCode:`<?php
function addNumbers($a $b) {
    return $a + $b
}

$result = addNumbers(10, 20)
echo "Result: " . reslt;
?>
`,
    },
    ruby: {
      id:"ruby", label:"Ruby", ext:"rb", mode:"ruby", icon:"💎", version:"3.x",
      pistonId:"ruby", pistonVersion:"3.2.1",
      defaultCode:`def find_largest(arr)
  largest = arr[0
  arr.each do |n|
    if n > largeest
      largest = n
    end
  end
  lrgest
end

puts find_largest([3, 7, 1, 9, 4])
`,
    },
    rust: {
      id:"rust", label:"Rust", ext:"rs", mode:"rust", icon:"🦀", version:"1.x",
      pistonId:"rust", pistonVersion:"1.68.2",
      defaultCode:`fn factorial(n u32) -> u32 {
    if n == 0 { return 1; }
    n * factorial(n - 1
}

fn main() {
    println!("5! = {}", factoril(5));
}
`,
    },
  },

  errorTypes: {
    SyntaxError:  {cssClass:"tag-syntax",  label:"SyntaxError" },
    RuntimeError: {cssClass:"tag-runtime", label:"RuntimeError"},
    LogicError:   {cssClass:"tag-logic",   label:"LogicError"  },
    Warning:      {cssClass:"tag-warning", label:"Warning"     },
  },

  buildPrompt(code, traceback = "") {
    const language = CODEFIX_CONCEPT.currentLanguage || "Python";
    
    let tracebackContext = "";
    if (traceback) {
      tracebackContext = `\nCRITICAL CONTEXT: When executing this code, the compiler/interpreter threw the following error:\n\`\`\`\n${traceback}\n\`\`\`\nYou MUST provide a fix for this specific runtime/compilation error.\n`;
    }

    return `You are an expert ${language} debugger.
Analyze the following ${language} code and identify ALL errors.
CRITICAL INSTRUCTION: You MUST respond ONLY with a single valid JSON object. Absolutely no markdown formatting, no conversational text, no explanations outside the JSON block. Your entire response must be parseable by JSON.parse().

Expected JSON Format:

{
  "errors": [{"line":<int>,"type":"SyntaxError|RuntimeError|LogicError|Warning","message":"<desc>","fix":"<how to fix>"}],
  "fixed_code": "<complete corrected ${language} code>",
  "explanation": "<each issue as a separate sentence ending with a period>"
}

Rules:
- fixed_code must be a complete working replacement.
- Escape double quotes inside strings with backslash.
- Do NOT use markdown code blocks.${tracebackContext}

${language} code:
\`\`\`${language.toLowerCase()}
${code}
\`\`\``;
  },

  editorConfig: {
    mode:"python", theme:"dracula", lineNumbers:true,
    matchBrackets:true, autoCloseBrackets:true, styleActiveLine:true,
    indentUnit:4, tabSize:4, indentWithTabs:false,
    gutters:["CodeMirror-linenumbers","error-gutter"],
  },

  ollamaDefaults: { defaultUrl:"http://127.0.0.1:11434", temperature:0.1, statusCheckMs:8000, numCtx: 8192 },

  messages: {
    ready:       "Ready — select a language and write your code",
    analyzing:   (m) => `Asking ${m} to analyze your code…`,
    done:        (n) => `Found ${n} issue${n!==1?"s":""}`,
    noneFound:   "No errors detected — code looks clean!",
    applied:     "Fixed code applied to editor",
    running:     "Running code…",
    runDone:     (ms) => `Executed in ${ms}ms`,
    ollamaOnline:"Ollama connected",
    ollamaOffline:"Service offline",
    noCode:      "No code to run!",
    networkErr:  (m) => `Network error: ${m}`,
  },

  toastDuration: 2800,
  PISTON_API: "https://emkc.org/api/v2/piston/execute",
};

window.CODEFIX_CONCEPT = CODEFIX_CONCEPT;
