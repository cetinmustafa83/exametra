import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');

// Patterns indicating potential memory leaks
const leakPatterns = {
  uncleared_listeners: {
    pattern: /addEventListener\s*\([^)]*\)/g,
    warning: 'Event listener without removeEventListener cleanup'
  },
  uncleared_timers: {
    pattern: /(setInterval|setTimeout)\s*\(/g,
    warning: 'Timer without clear/clearInterval cleanup'
  },
  missing_cleanup: {
    pattern: /useEffect\s*\(\s*\([^)]*\)\s*=>\s*\{[^}]*\},\s*\[\s*\]\s*\)/g,
    warning: 'useEffect with empty dependency array but no cleanup'
  },
  unsubscribe: {
    pattern: /\.subscribe\s*\([^)]*\)/g,
    warning: 'Observable subscription without unsubscribe'
  }
};

let issuesFound = 0;
let filesScanned = 0;

function scanFile(filePath) {
  filesScanned++;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  let fileIssues = 0;

  // Check for uncleared event listeners
  const hasAddEventListener = content.includes('addEventListener');
  if (hasAddEventListener) {
    const addCount = (content.match(/addEventListener/g) || []).length;
    const removeCount = (content.match(/removeEventListener/g) || []).length;
    if (addCount > removeCount) {
      console.log(`\n⚠️  ${path.relative(projectRoot, filePath)}`);
      console.log(`   Found ${addCount} addEventListener but only ${removeCount} removeEventListener`);
      issuesFound++;
      fileIssues++;
    }
  }

  // Check for uncleared timers
  const hasSetInterval = content.includes('setInterval');
  if (hasSetInterval) {
    const setCount = (content.match(/setInterval/g) || []).length;
    const clearCount = (content.match(/clearInterval/g) || []).length;
    if (setCount > clearCount) {
      console.log(`\n⚠️  ${path.relative(projectRoot, filePath)}`);
      console.log(`   Found ${setCount} setInterval but only ${clearCount} clearInterval`);
      issuesFound++;
      fileIssues++;
    }
  }

  // Check for setTimeout without cleanup
  const hasSetTimeout = content.includes('setTimeout');
  if (hasSetTimeout && !content.includes('clearTimeout')) {
    console.log(`\n⚠️  ${path.relative(projectRoot, filePath)}`);
    console.log(`   Found setTimeout but no clearTimeout found`);
    issuesFound++;
    fileIssues++;
  }

  // Check for subscriptions without unsubscribe
  const hasSubscribe = content.includes('.subscribe(');
  if (hasSubscribe && !content.includes('.unsubscribe()')) {
    console.log(`\n⚠️  ${path.relative(projectRoot, filePath)}`);
    console.log(`   Found .subscribe() but no .unsubscribe() found`);
    issuesFound++;
    fileIssues++;
  }

  // Check for useEffect with empty deps but complex logic
  const useEffectMatches = content.matchAll(/useEffect\s*\(\s*\([^)]*\)\s*=>\s*\{([^}]+)\},\s*\[\s*\]\s*\)/g);
  for (const match of useEffectMatches) {
    const body = match[1];
    if (body.includes('addEventListener') || body.includes('setInterval') || body.includes('subscribe')) {
      console.log(`\n⚠️  ${path.relative(projectRoot, filePath)}`);
      console.log(`   useEffect with [] deps contains event/timer/subscription logic`);
      issuesFound++;
      fileIssues++;
    }
  }

  return fileIssues;
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      walkDirectory(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      scanFile(filePath);
    }
  }
}

console.log('🔍 Memory Leak Audit\n');
console.log(`Scanning ${srcDir}...\n`);

walkDirectory(srcDir);

console.log('\n' + '='.repeat(60));
console.log(`\nResults:`);
console.log(`- Files scanned: ${filesScanned}`);
console.log(`- Issues found: ${issuesFound}`);
console.log(`\n✅ Run 'npm run memory-fix' to auto-fix common issues\n`);

process.exit(issuesFound > 0 ? 1 : 0);
