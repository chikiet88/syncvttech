import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '.env') });

async function go() {
  const base = process.env.VTTECH_BASE_URL!;
  const cookies: string[] = [];
  function upd(h: any) { if (h['set-cookie']) for (const c of h['set-cookie']) { const p = c.split(';')[0]; const n = p.split('=')[0]; const i = cookies.findIndex(x => x.startsWith(n+'=')); if (i>=0) cookies[i]=p; else cookies.push(p); } }
  
  const lp = await axios.get(base + '/Login/Login', { maxRedirects: 0, validateStatus: () => true });
  upd(lp.headers);
  const lr = await axios.post(base + '/api/Author/Login', {UserName: process.env.VTTECH_USERNAME, Password: process.env.VTTECH_PASSWORD, PasswordEnCrypt:'',IP:'',TokenFCM:'',From:'',SSO:'',Lan:'vi',TokenSSO:''}, { headers: { Cookie: cookies.join('; ') }, validateStatus: () => true });
  upd(lr.headers);
  const token = lr.data.Session;
  cookies.push('WebToken=' + token);
  
  const dr = await axios.get(base + '/appointment/appointmentinday/', { headers: { Cookie: cookies.join('; '), Accept: 'text/html' }, maxRedirects: 5, validateStatus: () => true });
  upd(dr.headers);
  
  // Try SessionData
  const sd = await axios.post(base + '/api/Home/SessionData', {}, { headers: { Cookie: cookies.join('; '), Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, validateStatus: () => true });
  console.log('SessionData:', sd.status);
  if (sd.data && typeof sd.data === 'object') {
    for (const k of Object.keys(sd.data)) {
      if (k.toLowerCase().includes('secret')) console.log('  FOUND:', k, '=', sd.data[k]);
    }
  }
  
  // Try GetBaseData
  const bd = await axios.post(base + '/api/Home/GetBaseData', {}, { headers: { Cookie: cookies.join('; '), Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, validateStatus: () => true });
  console.log('GetBaseData:', bd.status);
  if (bd.data && typeof bd.data === 'object') {
    for (const k of Object.keys(bd.data)) {
      if (k.toLowerCase().includes('secret')) console.log('  FOUND:', k, '=', bd.data[k]);
    }
    console.log('  Keys:', Object.keys(bd.data).join(', '));
  }

  // Try GetSecretKey direct
  const sk = await axios.post(base + '/api/Home/GetSecretKey', {}, { headers: { Cookie: cookies.join('; '), Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, validateStatus: () => true });
  console.log('GetSecretKey:', sk.status, typeof sk.data === 'string' ? sk.data.slice(0, 100) : JSON.stringify(sk.data).slice(0, 100));

  // Try Author/GetSecretKey
  const sk2 = await axios.post(base + '/api/Author/GetSecretKey', {}, { headers: { Cookie: cookies.join('; '), Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, validateStatus: () => true });
  console.log('Author/GetSecretKey:', sk2.status, typeof sk2.data === 'string' ? sk2.data.slice(0, 100) : JSON.stringify(sk2.data).slice(0, 100));
}
go();
