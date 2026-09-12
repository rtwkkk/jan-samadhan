const HELP_MENU_TEXT = `Ji, Other Help mein aap inmein se koi option choose kar sakte hain:

4. Complaint kaise register karein
5. Complaint ID kya hai aur iska kya use hai
6. Complaint register hone ke baad kya hota hai
7. Complaint ke liye kya information/evidence de sakte hain
8. Human support

Kripya 4 se 8 mein se koi option choose karein.`;

export async function handleOtherHelpFlow(userMessage: string, isInitialIntent: boolean): Promise<string> {
  if (isInitialIntent) {
    return HELP_MENU_TEXT;
  }

  const msg = userMessage.trim();
  const postfix = "\n\nAap kisi aur help ke liye 4 se 8 mein se option choose kar sakte hain, ya main menu ke liye 'hi' type karein.";

  if (msg === '4' || msg === '04' || msg === '4.') {
    return `Main menu se "1" choose karein.
Apna naam batayein.
Apni problem/complaint clearly batayein.
District batayein.
Village/City/Block batayein.
Location, affected people, or evidence/photo can be provided if available.
System summary dikhayega.
Citizen confirmation dega.
Confirmation ke baad complaint register hogi aur Complaint ID milegi.` + postfix;
  }
  
  if (msg === '5' || msg === '05' || msg === '5.') {
    return `Complaint ID complaint register hone ke baad milti hai.
Example: CMP-944912.
Ye unique reference number hai.
Isse future mein apni complaint identify/check karne ke liye use kiya ja sakta hai.
Complaint status ke liye main menu mein "2" choose karein.` + postfix;
  }
  
  if (msg === '6' || msg === '06' || msg === '6.') {
    return `System complaint ko successfully register karta hai.
Complaint ID provide hoti hai.
Complaint record system mein save hota hai.
Complaint concerned department/process ke according handle ki ja sakti hai.
Citizen baad mein main menu ke Option 2 se current status check kar sakta hai.` + postfix;
  }
  
  if (msg === '7' || msg === '07' || msg === '7.') {
    return `Complaint registration ke liye ye information zaroori hai:
- Name
- Complaint/problem
- District
- Village/City/Block

Ye information helpful but optional hai:
- Exact location
- Number of people affected
- Photo/evidence
- Other useful details about the problem

Ye optional evidence mandatory nahi hai.` + postfix;
  }
  
  if (msg === '8' || msg === '08' || msg === '8.') {
    return `Ji, agar aapko human support ki zarurat hai, aapki request support team tak pahunchayi ja sakti hai. Human support availability ke according aapki request handle ki jayegi.` + postfix;
  }

  return "Ji, kripya 4 se 8 mein se koi option choose karein, ya main menu ke liye 'hi' type karein.";
}
