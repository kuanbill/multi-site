'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

interface Props {
  /** light：深色底上的白字；dark：淺色底上的深色字。 */
  tone?: 'light' | 'dark';
  className?: string;
}

function subscribeDisplayMode(onStoreChange: () => void) {
  const query = window.matchMedia('(display-mode: standalone)');
  query.addEventListener('change', onStoreChange);
  return () => query.removeEventListener('change', onStoreChange);
}

function getStandaloneSnapshot() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function InstallAppButton({ tone = 'dark', className = '' }: Props) {
  const standalone = useSyncExternalStore(subscribeDisplayMode, getStandaloneSnapshot, () => false);
  const [installedByEvent, setInstalledByEvent] = useState(false);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => setInstalledByEvent(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (standalone || installedByEvent) return null;

  async function handleInstall() {
    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      setPromptEvent(null);
      if (choice.outcome === 'accepted') setInstalledByEvent(true);
      return;
    }
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      alert('iOS 安裝方式：點選 Safari 的「分享」按鈕，再選擇「加入主畫面」。');
      return;
    }
    alert('請從瀏覽器選單選擇「安裝應用程式」或「將網頁加入主畫面」。');
  }

  const toneClass =
    tone === 'light'
      ? 'border-white/50 text-white hover:bg-white/10'
      : 'border-gray-300 text-gray-700 hover:bg-gray-100';

  return (
    <button
      type="button"
      onClick={handleInstall}
      title="安裝為桌面／主畫面應用程式"
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm ${toneClass} ${className}`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
      安裝到桌面
    </button>
  );
}
