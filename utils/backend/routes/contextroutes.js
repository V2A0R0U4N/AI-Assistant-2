// router.post("/ask", async (req, res) => {
//   const { question, context } = req.body;

//   const aiPrompt = `
// You are a helpful AI assistant. The user is currently on: ${context.url} (${context.title}).
// They selected this text: "${context.selectedText}".
// Answer their question accordingly:
// ${question}
// `;

//   const completion = await openai.chat.completions.create({
//     model: "gpt-4o-mini",
//     messages: [{ role: "user", content: aiPrompt }],
//   });

//   const answer = completion.choices[0].message.content;
//   res.json({ answer });
// });
