import { useEffect, useState } from 'react';

interface ShareStat {
  title: string;
  value: string;
}

function shareImage(result: string, group: string, stats: readonly ShareStat[]): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = stats.length ? 620 : 436;
  const drawing = canvas.getContext('2d');
  if (!drawing) return Promise.reject(new Error('Canvas is unavailable'));
  const context = drawing;

  const ink = '#1d1a16';
  const display = '"Unbounded Variable", system-ui, sans-serif';
  const body = '"Manrope Variable", system-ui, sans-serif';

  function text(value: string, x: number, y: number, font: string, color = ink) {
    context.font = font;
    context.fillStyle = color;
    context.fillText(value, x, y);
  }

  function card(x: number, y: number, width: number, height: number, fill: string) {
    context.beginPath();
    context.roundRect(x, y, width, height, 20);
    context.fillStyle = fill;
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = ink;
    context.stroke();
  }

  context.fillStyle = '#fff3d5';
  context.fillRect(0, 0, canvas.width, canvas.height);
  text('LEFT.', 40, 54, `800 22px ${body}`, '#c43f26');
  text('RIGHT.', 108, 54, `800 22px ${body}`, '#2947bd');
  text('My results', 40, 123, `800 47px ${display}`);

  card(40, 158, 880, 214, '#fff7e3');
  text(result, 66, 270, `820 74px ${display}`);
  text('My starting group · ' + group, 66, 310, `800 25px ${body}`);
  text('of my answers matched my group’s most common choice.', 66, 344, `650 25px ${body}`);

  const width = (880 - 16 * (stats.length - 1)) / stats.length;
  stats.forEach(({ title, value }, index) => {
    const x = 40 + index * (width + 16);
    card(x, 390, width, 148, index === 0 ? '#fceab1' : '#c2cbed');
    text(value, x + 25, 463, `820 46px ${display}`);
    text(title, x + 25, 502, `800 23px ${body}`);
  });
  text('imax1s.github.io/left-right-ess', 40, canvas.height - 32, `700 20px ${body}`);
  text('European Social Survey · Round 11', 584, canvas.height - 32, `700 20px ${body}`);

  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (blob) resolve(blob);
    else reject(new Error('Could not create the image'));
  }, 'image/png'));
}

export function ShareTakeaway({ result, group, stats }: {
  result: string; group: string; stats: readonly ShareStat[];
}) {
  const [status, setStatus] = useState('');
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(''), 2500);
    return () => window.clearTimeout(timer);
  }, [status]);

  async function share() {
    setSharing(true);
    setStatus('');
    try {
      const png = shareImage(result, group, stats);
      if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
          setStatus('Image copied');
          return;
        } catch {
          // Some browsers allow downloading a PNG but block clipboard images.
        }
      }
      const url = URL.createObjectURL(await png);
      const download = document.createElement('a');
      download.href = url;
      download.download = 'left-right-takeaway.png';
      download.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus('Image downloaded');
    } catch {
      setStatus('Couldn’t create the image');
    } finally {
      setSharing(false);
    }
  }

  return <div className="takeaway-share">
    <button onClick={share} disabled={sharing}>Share</button>
    <span role="status" className="share-toast">{status}</span>
  </div>;
}
