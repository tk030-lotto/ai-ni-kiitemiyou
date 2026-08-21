/**
 * AIに聞いてみよう。ツール - ロジックエンジン (app.js)
 * 自由入力から最適なAIプロンプト（構造化質問文）を生成
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const userInput = document.getElementById('userInput');
  const charCount = document.getElementById('charCount');
  const langEnvInput = document.getElementById('langEnvInput');
  const errorCodeInput = document.getElementById('errorCodeInput');
  const toggleDetailBtn = document.getElementById('toggleDetailBtn');
  const detailFields = document.getElementById('detailFields');
  
  const generateBtn = document.getElementById('generateBtn');
  const clearInputBtn = document.getElementById('clearInputBtn');
  
  const inputSection = document.getElementById('inputSection');
  const outputSection = document.getElementById('outputSection');
  const promptResult = document.getElementById('promptResult');
  const copyTopBtn = document.getElementById('copyTopBtn');
  const copyMainBtn = document.getElementById('copyMainBtn');
  const editBtn = document.getElementById('editBtn');
  const resetBtn = document.getElementById('resetBtn');
  
  const chips = document.querySelectorAll('.chip');
  const tuneButtons = document.querySelectorAll('.btn-tune');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');

  let currentTuneMode = 'standard';
  let lastGeneratedPrompt = '';
  let toastTimer = null;

  // 1. Character Counter
  userInput.addEventListener('input', () => {
    charCount.textContent = `${userInput.value.length} 文字`;
  });

  // 2. Preset Chips Click
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const exampleText = chip.getAttribute('data-example');
      if (userInput.value.trim() === '') {
        userInput.value = exampleText;
      } else {
        userInput.value += `\n${exampleText}`;
      }
      userInput.dispatchEvent(new Event('input'));
      userInput.focus();
    });
  });

  // 3. Toggle Optional Accordion
  toggleDetailBtn.addEventListener('click', () => {
    const isHidden = detailFields.style.display === 'none';
    detailFields.style.display = isHidden ? 'flex' : 'none';
    toggleDetailBtn.querySelector('.toggle-icon').textContent = isHidden ? '−' : '＋';
  });

  // 4. Clear Input
  clearInputBtn.addEventListener('click', () => {
    userInput.value = '';
    langEnvInput.value = '';
    errorCodeInput.value = '';
    userInput.dispatchEvent(new Event('input'));
    userInput.focus();
  });

  // 5. Generate Prompt Logic
  function generatePrompt(mode = 'standard') {
    const rawInput = userInput.value.trim();
    if (!rawInput) {
      showToast('⚠️ 分からないことを入力してください。', 2500);
      userInput.focus();
      return;
    }

    const env = langEnvInput.value.trim();
    const code = errorCodeInput.value.trim();

    // Analyze intent
    const isError = /エラー|error|動かない|落ちる|失敗|exception|undefined|cannot/i.test(rawInput + ' ' + code);
    const isHowTo = /どうやって|作り方|実装|方法|作りたい|手順|やり方/i.test(rawInput);
    const isNext = /次|何すれば|進め方|ロードマップ|これから/i.test(rawInput);
    const isReview = /合っているか|確認|レビュー|大丈夫|問題ない|合ってる/i.test(rawInput);

    let prompt = '';

    // Header Instruction
    prompt += `【質問内容】\n`;
    prompt += `現在、ソフトウェア開発を行っています。\n`;
    prompt += `以下の点について、分かりやすく教えてください。\n\n`;

    // 1. Main Problem / Goal
    prompt += `■ やりたいこと・困っていること\n`;
    prompt += `${rawInput}\n\n`;

    // 2. Environment (if provided)
    if (env) {
      prompt += `■ 開発環境・言語\n`;
      prompt += `${env}\n\n`;
    }

    // 3. Error / Code Details (if provided)
    if (code) {
      prompt += `■ 該当のコード / エラーログ\n`;
      prompt += `\`\`\`\n${code}\n\`\`\`\n\n`;
    } else if (isError) {
      prompt += `■ エラーメッセージ・詳細\n`;
      prompt += `（※エラー全文がある場合は、ここに貼り付けるとさらに正確な回答が得られます）\n\n`;
    }

    // 4. Specific Requests based on Tune Mode
    prompt += `■ AIへの要望\n`;
    switch (mode) {
      case 'step-by-step':
        prompt += `1. 問題を解決するための【具体的な手順】をステップバイステップで1から順に解説してください。\n`;
        prompt += `2. どのファイルのどこを修正すればよいかを、前後のコード例を含めて明示してください。\n`;
        prompt += `3. 作業後に動作確認を行うテスト方法もあわせて教えてください。\n`;
        break;

      case 'cause-only':
        prompt += `1. この現象やエラーが発生している【根本的な原因と仕組み】を論理的に解説してください。\n`;
        prompt += `2. 初心者が陥りやすい典型的な間違いや、関連する仕様について補足してください。\n`;
        break;

      case 'simple':
        prompt += `1. 前置きは省き、結論と【修正すべきコードの要点】のみを簡潔に提示してください。\n`;
        prompt += `2. 最小限の変更で動くコード例をお願いします。\n`;
        break;

      case 'beginner':
        prompt += `1. 専門用語をできるだけ使わず、初心者にも理解できるように分かりやすい例えを交えて解説してください。\n`;
        prompt += `2. 「なぜそうするのか」の理由もやさしく教えてください。\n`;
        prompt += `3. つまずきやすいポイントがあれば事前に教えてください。\n`;
        break;

      case 'standard':
      default:
        if (isError) {
          prompt += `1. このエラーや不具合が発生する原因として考えられることを挙げてください。\n`;
          prompt += `2. 確認すべき箇所と、具体的な修正手順（コード例付き）を教えてください。\n`;
          prompt += `3. 初心者にも分かりやすいように、必要な前提や注意点も補足してください。\n`;
        } else if (isHowTo) {
          prompt += `1. この機能を実現するための最適なアプローチと設計方針を教えてください。\n`;
          prompt += `2. 具体的な実装コード例と、必要な設定手順をステップ順に提示してください。\n`;
        } else if (isNext) {
          prompt += `1. 現在の状況から次に着手すべき具体的なタスクを優先度順に提示してください。\n`;
          prompt += `2. 各ステップで確認すべき完了条件を教えてください。\n`;
        } else if (isReview) {
          prompt += `1. この設定や内容に潜在的な問題や不足点がないか確認してください。\n`;
          prompt += `2. より良くなる改善点やベストプラクティスがあれば教えてください。\n`;
        } else {
          prompt += `1. 疑問点に対する明確な回答と、具体的な解決策を教えてください。\n`;
          prompt += `2. 実際の実装や設定例があればあわせて提示してください。\n`;
        }
        break;
    }

    lastGeneratedPrompt = prompt;
    promptResult.querySelector('code').textContent = prompt;

    // Show output section
    outputSection.style.display = 'block';
    outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // 6. Generate Button Action
  generateBtn.addEventListener('click', () => {
    generatePrompt(currentTuneMode);
  });

  // 7. Tune Mode Buttons
  tuneButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tuneButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTuneMode = btn.getAttribute('data-tune');
      generatePrompt(currentTuneMode);
      showToast(`質問スタイルを「${btn.textContent}」に切り替えました`);
    });
  });

  // 8. Clipboard Copy Helper
  async function copyToClipboard(text) {
    if (!text) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      showToast('📋 コピーしました。AIに送ってみましょう！');
    } catch (err) {
      console.error('Copy failed:', err);
      showToast('⚠️ コピーに失敗しました。手動で選択してコピーしてください。');
    }
  }

  copyTopBtn.addEventListener('click', () => copyToClipboard(lastGeneratedPrompt));
  copyMainBtn.addEventListener('click', () => copyToClipboard(lastGeneratedPrompt));

  // 9. Edit Button
  editBtn.addEventListener('click', () => {
    inputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    userInput.focus();
  });

  // 10. Reset Button
  resetBtn.addEventListener('click', () => {
    userInput.value = '';
    langEnvInput.value = '';
    errorCodeInput.value = '';
    userInput.dispatchEvent(new Event('input'));
    outputSection.style.display = 'none';
    tuneButtons.forEach(b => b.classList.remove('active'));
    document.querySelector('.btn-tune[data-tune="standard"]').classList.add('active');
    currentTuneMode = 'standard';
    inputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    userInput.focus();
    showToast('🔄 入力をリセットしました');
  });

  // 11. Toast Utility
  function showToast(msg, duration = 3000) {
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    toastMessage.textContent = msg;
    toast.classList.add('show');
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }
});
