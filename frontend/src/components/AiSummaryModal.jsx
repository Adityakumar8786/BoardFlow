import { useToast } from "../context/ToastContext";

export default function AiSummaryModal({ open, loading, error, summary, hasContent, onRegenerate, onClose }) {
  const { showToast } = useToast();

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary || "");
      showToast("Summary copied to clipboard", "success");
    } catch {
      showToast("Could not copy to clipboard", "error");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card ai-summary-card" onClick={(e) => e.stopPropagation()}>
        <div className="ai-summary-header">
          <h3>✨ AI Whiteboard Summary</h3>
          <button className="icon-btn" onClick={onClose} title="Close">✕</button>
        </div>

        {loading && (
          <div className="ai-summary-loading">
            <span className="spinner" />
            <span>Reading the whiteboard...</span>
          </div>
        )}

        {!loading && error && <div className="form-error">{error}</div>}

        {!loading && !error && summary && (
          <p className={`ai-summary-text ${hasContent === false ? "muted" : ""}`}>{summary}</p>
        )}

        <div className="modal-actions ai-summary-actions">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          {summary && hasContent !== false && !loading && (
            <button className="btn btn-secondary" onClick={handleCopy}>Copy Summary</button>
          )}
          <button className="btn btn-primary" onClick={onRegenerate} disabled={loading}>
            {loading ? "Generating..." : "↻ Regenerate"}
          </button>
        </div>
      </div>
    </div>
  );
}
