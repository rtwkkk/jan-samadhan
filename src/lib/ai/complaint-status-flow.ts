import { ComplaintRepository } from '@/lib/mongodb/repositories/ComplaintRepository';

function extractComplaintId(text: string): string | null {
  const match = text.match(/CMP-[A-Z0-9]{6}/i);
  return match ? match[0].toUpperCase() : null;
}

const statusMap: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed"
};

export async function handleComplaintStatusFlow(accountId: string, userMessage: string): Promise<string> {
  const complaintId = extractComplaintId(userMessage);

  if (!complaintId) {
    return "Ji, kripya apna Complaint ID bhejiye. Example: CMP-944912";
  }

  try {
    const complaint = await ComplaintRepository.getComplaintStatus(accountId, complaintId);

    if (!complaint) {
      return "Ji, is Complaint ID se koi complaint nahi mili. Kripya Complaint ID check karke dobara bhejiye. Example: CMP-944912";
    }

    const readableStatus = statusMap[complaint.status || 'open'] || 'Unknown';
    let responseText = `*Complaint ID:* ${complaint.complaintId}\n`;
    responseText += `*Status:* ${readableStatus}\n`;
    responseText += `*Type:* ${complaint.complaintType}\n`;
    responseText += `*Description:* ${complaint.description}\n`;
    responseText += `*District:* ${complaint.district}\n`;
    responseText += `*Village/Block:* ${complaint.villageCityBlock}\n`;
    
    if ((complaint as any).department) {
      responseText += `*Department:* ${(complaint as any).department}\n`;
    }
    if (complaint.priority) {
      responseText += `*Priority:* ${complaint.priority.charAt(0).toUpperCase() + complaint.priority.slice(1)}\n`;
    }

    responseText += `\nStatus check karne ke liye doosra Complaint ID bhejein ya menu ke liye 'hi' type karein.`;
    return responseText;
  } catch (err) {
    console.error('[AI Handler] DB Error checking status:', err);
    return "Maaf karna, status check karte waqt error aagaya. Thodi der mein try karein.";
  }
}
