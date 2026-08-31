"use client";

import { useRouter } from "next/navigation";

/**
 * Small "go back" control that returns to the previous page in the browser
 * history. Falls back to `fallbackHref` when there is no history to go back to
 * (e.g. the page was opened directly).
 */
export default function BackButton({ fallbackHref = "/passport", label = "Back" }) {
  const router = useRouter();

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <button type="button" className="back-button" onClick={goBack}>
      <span aria-hidden="true">&#8592;</span> {label}
    </button>
  );
}
