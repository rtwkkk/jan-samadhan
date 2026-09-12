const text = " ```json\n{\n  \"a\": 1\n}\n```";
const cleanedText = text
  .replace(/^```(?:json)?/im, '')
  .replace(/```$/im, '')
  .trim();
console.log("CLEANED:", cleanedText);
