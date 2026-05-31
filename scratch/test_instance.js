const EVOLUTION_URL = 'https://magicalsunbear-evolution.cloudfy.live';
const EVOLUTION_KEY = 'f5rWiygQHGJZ0dDPcokLxOrSQko30mPa';

async function test() {
  const instanceName = 'pixrescue-user-test';
  
  try {
    const res = await fetch(`${EVOLUTION_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    });
    
    const data = await res.json().catch(() => ({}));
    console.log('STATUS:', res.status);
    console.log('DATA:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('ERROR:', err);
  }
}

test();
