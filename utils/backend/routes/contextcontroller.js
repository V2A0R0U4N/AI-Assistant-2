// import Context from "../models/contextModel.js";
// import OpenAI from "openai";

// const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

// export const storeContext = async (req, res) => {
//   const context = new Context(req.body);
//   await context.save();
//   res.json({ message: "Context stored" });
// };

// export const summarize = async (req, res) => {
//   const { text } = req.body;
//   const summaryResponse = await openai.chat.completions.create({
//     model: "gpt-4o-mini",
//     messages: [{ role: "user", content: `Summarize this: ${text}` }]
//   });

//   const summary = summaryResponse.choices[0].message.content;
//   res.json({ summary });
// };
