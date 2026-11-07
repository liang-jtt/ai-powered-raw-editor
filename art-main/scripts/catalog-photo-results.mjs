import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { shanghaiTimestamp } from '../dist/output-naming.js';

// Historical timestamps come from the original rendered file's mtime.
const catalog = path.resolve('output/photo-comparison');
await fs.mkdir(catalog, { recursive: true });
const sources = [
  { directory: 'output/viewer-2026-11-06', mode: 'default', model: 'gpt-5.6-terra', image: 'DSC02691_processed.jpg', pp3: 'DSC02691.pp3' },
  { directory: 'output/viewer-balanced', mode: 'balanced', model: 'gpt-5.6-terra', image: 'DSC02691_processed.jpg', pp3: 'DSC02691.pp3' },
  { directory: 'output/viewer-creative', mode: 'creative', model: 'gpt-5.6-terra', image: 'DSC02691_processed.jpg', pp3: 'DSC02691.pp3' },
];
for (const latestDirectory of ['output/viewer-creative-gpt-6.1-sol', 'output/viewer-clear-gpt-6.1-sol', 'output/viewer-kb-guided-gpt-6.1-sol', 'output/viewer-clear-luminance-gpt-6.1-sol', 'output/DSC02691-clear-skytrial-gpt-6.1-sol', 'output/DSC02691-clear-skycolor-gpt-6.1-sol', 'output/DSC02691-clear-skycolor-formatfix-gpt-6.1-sol']) {
  let entries;
  try { entries = await fs.readdir(latestDirectory); }
  catch (error) { if (error.code === 'ENOENT') continue; throw error; }
  for (const entry of entries) {
    if (!entry.endsWith('.jpg.run.json')) continue;
    const run = JSON.parse(await fs.readFile(path.join(latestDirectory, entry), 'utf8'));
    sources.push({ directory: latestDirectory, mode: run.preset, model: run.model,
      variant: latestDirectory.includes('clear-luminance') ? 'luminance-update' : latestDirectory.includes('clear-skytrial') ? 'sky-attention-trial' : latestDirectory.includes('clear-skycolor-formatfix') ? 'sky-color-formatfix' : latestDirectory.includes('clear-skycolor') ? 'sky-color-trial' : null,
      image: path.basename(run.image), pp3: path.basename(run.pp3), completed_at: run.completed_at });
  }
}
const humanTime = date => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
}).format(date) + ' +08:00';
const records = [];
for (const source of sources) {
  const original = path.resolve(source.directory, source.image);
  const stat = await fs.stat(original);
  const modeLabel = source.variant ? `${source.mode}-${source.variant}` : source.mode;
  const stem = `DSC02691_${modeLabel}_${source.model}_${shanghaiTimestamp(stat.mtime)}`;
  const image = path.join(catalog, stem + '.jpg');
  const pp3 = path.join(catalog, stem + '.pp3');
  await fs.copyFile(original, image);
  await fs.utimes(image, stat.atime, stat.mtime);
  await fs.copyFile(path.join(source.directory, source.pp3), pp3);
  const profileStat = await fs.stat(path.join(source.directory, source.pp3));
  await fs.utimes(pp3, profileStat.atime, profileStat.mtime);
  const preview = path.join(catalog, stem + '_preview.jpg');
  await sharp(image).rotate().resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
    .withIccProfile('srgb').jpeg({ quality: 94 }).toFile(preview);
  const record = { mode: source.mode, variant: source.variant ?? null, model: source.model,
    modified_at: stat.mtime.toISOString(), modified_at_shanghai: humanTime(stat.mtime),
    timestamp_source: 'Original rendered image filesystem modification time',
    completed_at: source.completed_at ?? null, image, pp3, preview, source_image: original };
  await fs.writeFile(path.join(catalog, stem + '.run.json'), JSON.stringify(record, null, 2));
  records.push(record);
}
await fs.writeFile(path.join(catalog, 'index.json'), JSON.stringify(records, null, 2));
const rows = records.map(r => `| ${r.variant === 'luminance-update' ? r.mode + '（明度模块更新版）' : r.variant === 'sky-attention-trial' ? r.mode + '（天空提示词试验版）' : r.variant === 'sky-color-trial' ? r.mode + '（天空曲线初次试验，偏紫）' : r.variant === 'sky-color-formatfix' ? r.mode + '（天空曲线格式修正版）' : r.mode} | ${r.model} | ${r.modified_at_shanghai} | [查看图片](${path.basename(r.image)}) |`).join('\n');
await fs.writeFile(path.join(catalog, '图片索引.md'), `# DSC02691 修图版本\n\n时间均为北京时间，取自原成片文件的修改时间；原文件保留。\n\n| 模式 | 模型 | 成片修改时间 | 文件 |\n| --- | --- | --- | --- |\n${rows}\n`);
console.log(JSON.stringify(records, null, 2));
