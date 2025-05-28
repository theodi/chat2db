## 🧠 Assistant UI Frontend with Chart.js Support

This frontend is powered by [Assistant UI](https://github.com/assistant-ui/assistant-ui) and connects to a local OpenAI-compatible backend. It adds a custom `chart_renderer` tool for visualising query results using Chart.js.

---

### 🛠️ Setup

#### 1. Scaffold the frontend

Install the frontend via the official CLI:

```bash
npx assistant-ui create
cd <your-project-name>
```

Follow the prompts to create a new assistant.

---

#### 2. Configure the OpenAI backend

Edit `lib/openai.ts`:

```ts
import { createOpenAI } from "@ai-sdk/openai";

// ✅ Custom local OpenAI-compatible backend
export const localOpenAI = createOpenAI({
  baseURL: "http://localhost:3001/v1", // your backend URL
  apiKey: "dummy", // required but unused
});
```

---

#### 3. Use custom OpenAI config in route

Edit `app/api/chat/route.ts`:

```ts
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { streamText } from "ai";
import { localOpenAI } from "@/lib/openai";

export const runtime = "edge";
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, system, tools } = await req.json();

  const result = streamText({
    model: localOpenAI.chat("gpt-4"),
    messages,
    system,
    toolCallStreaming: true,
    tools: {
      ...frontendTools(tools),
    },
    onError: console.log,
  });

  return result.toDataStreamResponse();
}
```

---

### 📊 Add `chart_renderer` Tool

Create a new file at `components/assistant-ui/ChartRenderer.tsx`:

```tsx
import { FC } from "react";
import { Bar, Line, Pie, Chart as ChartJS } from "react-chartjs-2";
import {
  Chart as ChartJSCore,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Title
} from "chart.js";
import type { ToolCallContentPart } from "@assistant-ui/react";

// Register Chart.js modules
ChartJSCore.register(CategoryScale, LinearScale, BarElement, LineElement, ArcElement, Tooltip, Legend, Title);

type ChartInput = {
  type: string;
  data: any;
  options?: any;
};

export const ChartRenderer: FC<ToolCallContentPart<ChartInput>> = ({ args }) => {
  const { type, data, options } = args;

  const chartMap: Record<string, FC<any>> = {
    bar: Bar,
    line: Line,
    pie: Pie
  };

  const ChartComponent = chartMap[type];

  if (!ChartComponent) {
    return <div className="my-4 text-red-500">⚠️ Chart type "{type}" is not supported.</div>;
  }

  return (
    <div className="my-4">
      <h4 className="mb-2 font-bold capitalize">{type} Chart</h4>
      <ChartComponent data={data} options={options} />
    </div>
  );
};
```

---

### 🧩 Register the chart tool

Update the `AssistantMessage` in `components/assistant-ui/thread.tsx`:

```tsx
import { ChartRenderer } from "@/components/assistant-ui/ChartRenderer";

...

<MessagePrimitive.Content
  components={{
    Text: MarkdownText,
    tools: {
      by_name: {
        chart_renderer: ChartRenderer, // ✅ Custom tool
      },
      Fallback: ToolFallback,
    },
  }}
/>
```

---

### ✨ (Optional) Customise suggestions

Edit the `ThreadWelcomeSuggestions` component in `thread.tsx` to offer default prompts tailored to your database.

---

### 🚀 Run the frontend

```bash
npm install
npm run dev
```

Then open `http://localhost:3000` in your browser.

Make sure your backend is running at `http://localhost:3001/v1`.