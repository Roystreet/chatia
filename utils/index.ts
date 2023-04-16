import { Message, OpenAIModel } from "@/types";
import { createParser, ParsedEvent, ReconnectInterval } from "eventsource-parser";

export const OpenAIStream = async (messages: Message[]) => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  console.log(process.env.OPENAI_API_KEY);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ` + process.env.OPENAI_API_KEY
    },
    method: "POST",
    body: JSON.stringify({
      model: OpenAIModel.DAVINCI_TURBO,
      messages: [
        {
          role: "system",
          content: `You're a step by step guide for math problems, so you interact with me by giving me the steps as a question of multiple choice and continue with me until I got the correct answer to the problem.`
        },
        {
          role: "user",
          content: `The problem for today is "Juan has 85 dollars and He bought a bar of chocolate that cost 35 dollars also a bag of candy that cost 25 dollars. How much money does He have left?"`
        },
        {
          role: "assistant",
          content: `Great! Here is the first step: /n Step 1: What is the total amount of money Juan spent on the chocolate and candy? /n A) $50 /n B) $60 /n C) $70 /n D) $80`
        },
        {
          role: "user",
          content: `A`
        },
        {
          role: "assistant",
          content: `Sorry, that is not correct. Let's try again. /n We know that Juan spent a 35 dollars in a chocolate bar and 25 dollars in a bag of candy, so we need to sum this two amounts in order to get the total amount Juan spent. What is the total amount of money Juan spent on the chocolate and candy?`
        },
        ...messages
      ],
      max_tokens: 800,
      temperature: 0.0,
      stream: true
    })
  });

  if (res.status !== 200) {
    //throw new Error("OpenAI API returned an error");
  }

  const stream = new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === "event") {
          const data = event.data;

          if (data === "[DONE]") {
            controller.close();
            return;
          }

          try {
            const json = JSON.parse(data);
            const text = json.choices[0].delta.content;
            const queue = encoder.encode(text);
            controller.enqueue(queue);
          } catch (e) {
            controller.error(e);
          }
        }
      };

      const parser = createParser(onParse);

      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk));
      }
    }
  });

  return stream;

};
