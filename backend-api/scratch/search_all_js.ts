import axios from 'axios';

async function main() {
  const baseUrl = 'https://tmtaza.vttechsolution.com';
  const urls = [
    '/js/main.js',
    '/js/util/util.js',
    '/js/Preload/preload.js',
    '/js/Bundle/MasterSettingLocal.js',
    '/js/Bundle/bundle_files.js',
    '/js/comon/initialize_setting.js',
    '/js/dist/Utils/Theme/ThemeService.js',
    '/js/dist/Settings/System/SystemSetting.js'
  ];

  // Try finding scripts mentioned in dashboard or main page
  const dashRes = await axios.get(`${baseUrl}/Main/Dashboard/`, { validateStatus: () => true });
  if (typeof dashRes.data === 'string') {
    const matches = dashRes.data.match(/src=["']([^"']+\.js[^"']*)["']/g);
    if (matches) {
      for (const m of matches) {
        const src = m.replace(/src=["']/, '').replace(/["']$/, '');
        if (!urls.includes(src)) urls.push(src);
      }
    }
  }

  console.log(`Checking ${urls.length} js files...`);
  for (const u of urls) {
    const full = u.startsWith('http') ? u : `${baseUrl}${u.startsWith('/') ? '' : '/'}${u}`;
    try {
      const res = await axios.get(full, { validateStatus: () => true });
      if (typeof res.data === 'string' && res.data.includes('AjaxLoad')) {
        console.log(`\n FOUND AjaxLoad in ${u}!`);
        const idx = res.data.indexOf('function AjaxLoad') !== -1 ? res.data.indexOf('function AjaxLoad') : res.data.indexOf('AjaxLoad');
        console.log(res.data.substring(idx, idx + 800));
      }
    } catch {}
  }
}

main().catch(console.error);
