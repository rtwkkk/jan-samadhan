const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const STAGES = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'information_requested', label: 'Info Requested' },
  { key: 'verified', label: 'Verified' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'rejected', label: 'Rejected' } 
];

const width = 800;
const height = 150;
const yCenter = 80;
const xStart = 70;
const xEnd = 730;
const step = (xEnd - xStart) / 6;

const outDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function drawCheckmark(ctx, x, y) {
  ctx.beginPath();
  ctx.moveTo(x - 4, y);
  ctx.lineTo(x - 1, y + 3);
  ctx.lineTo(x + 5, y - 4);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
}

for (let activeIdx = 0; activeIdx < STAGES.length; activeIdx++) {
  const activeKey = STAGES[activeIdx].key;
  if (activeKey === 'rejected') continue;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#fcfcfc'; 
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('CHALLENGE PROGRESS', 30, 35);

  // Draw connecting line background
  ctx.beginPath();
  ctx.moveTo(xStart, yCenter);
  ctx.lineTo(xEnd, yCenter);
  ctx.strokeStyle = '#e2e8f0'; 
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw nodes
  for (let i = 0; i < 7; i++) {
    const cx = xStart + i * step;

    if (i < activeIdx) {
      // Done state
      ctx.beginPath();
      ctx.arc(cx, yCenter, 14, 0, 2 * Math.PI);
      ctx.fillStyle = '#10b981'; 
      ctx.fill();
      drawCheckmark(ctx, cx, yCenter);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 13px sans-serif';
    } else if (i === activeIdx) {
      // Active state
      ctx.beginPath();
      ctx.arc(cx, yCenter, 13, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#3b82f6'; 
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, yCenter, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();

      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 13px sans-serif';
    } else {
      // Pending state
      ctx.beginPath();
      ctx.arc(cx, yCenter, 13, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#cbd5e1'; 
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, yCenter, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#cbd5e1';
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
    }

    // Text
    ctx.textAlign = 'center';
    ctx.fillText(STAGES[i].label, cx, yCenter + 35);
  }

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  const filename = `progress-${activeKey}.png`;
  fs.writeFileSync(path.join(outDir, filename), buffer);
  console.log(`Generated ${filename}`);
}

console.log('All progress bar images generated successfully.');
