const PREVIEW_LENGTH = 60;

const preview = (text: string) => {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > PREVIEW_LENGTH ? `${oneLine.slice(0, PREVIEW_LENGTH).trimEnd()}...` : oneLine;
};

// What the robot says when an admin has solved something this person reported.
export const solvedNotice = (items: { text: string; unseen: boolean }[], unseenCount: number) => {
  if (unseenCount > 1) return `${unseenCount} of your issues have been solved.`;
  const solved = items.find((item) => item.unseen);
  return solved ? `Your issue was solved: "${preview(solved.text)}"` : "Your issue was solved.";
};

// Enter sends and Shift+Enter starts a new line, except while an input method
// (for Malayalam or Tamil, say) is still composing a word.
export const isSendKey = (event: { key: string; shiftKey: boolean; isComposing?: boolean }) =>
  event.key === "Enter" && !event.shiftKey && !event.isComposing;
