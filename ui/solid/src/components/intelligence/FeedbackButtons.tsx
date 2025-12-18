import { Component, createSignal, Show } from 'solid-js';

interface FeedbackButtonsProps {
  incidentId: string;
  fixId?: string;
  onFeedbackSubmitted?: (type: string) => void;
}

const FeedbackButtons: Component<FeedbackButtonsProps> = (props) => {
  const [submitting, setSubmitting] = createSignal(false);
  const [showNoteInput, setShowNoteInput] = createSignal(false);
  const [noteContent, setNoteContent] = createSignal('');
  const [feedbackResult, setFeedbackResult] = createSignal<{ success: boolean; message: string } | null>(null);

  const submitFeedback = async (type: string, content?: string) => {
    setSubmitting(true);
    setFeedbackResult(null);

    try {
      const response = await fetch(`/api/v2/incidents/${props.incidentId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          content: content || '',
          fixId: props.fixId
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setFeedbackResult({ success: true, message: result.message || 'Feedback submitted' });
        props.onFeedbackSubmitted?.(type);
        setShowNoteInput(false);
        setNoteContent('');
      } else {
        setFeedbackResult({ success: false, message: result.error || 'Failed to submit feedback' });
      }
    } catch (e) {
      setFeedbackResult({ success: false, message: 'Failed to submit feedback' });
    } finally {
      setSubmitting(false);
    }
  };

  const feedbackButtons = [
    { type: 'resolved', label: '✅ Mark Resolved', color: '#28a745' },
    { type: 'root_cause_confirmed', label: '🎯 Confirm Root Cause', color: '#17a2b8' },
    { type: 'fix_worked', label: '👍 Fix Worked', color: '#28a745', requiresFix: true },
    { type: 'fix_failed', label: '👎 Fix Failed', color: '#dc3545', requiresFix: true },
    { type: 'dismiss', label: '🔕 Dismiss', color: '#6c757d' },
    { type: 'escalate', label: '🚨 Escalate', color: '#ff6b6b' },
  ];

  return (
    <div style={{ background: 'var(--bg-card)', 'border-radius': '8px', border: '1px solid var(--border-color)' }}>
      {/* Header */}
      <div style={{ 
        padding: '12px 16px', 
        'border-bottom': '1px solid var(--border-color)'
      }}>
        <h4 style={{ margin: 0, color: 'var(--text-primary)', 'font-size': '14px', 'font-weight': '600' }}>
          💬 Provide Feedback
        </h4>
      </div>

      {/* Buttons */}
      <div style={{ padding: '12px' }}>
        <div style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '8px', 'margin-bottom': '12px' }}>
          {feedbackButtons
            .filter(btn => !btn.requiresFix || props.fixId)
            .map((btn) => (
              <button
                onClick={() => submitFeedback(btn.type)}
                disabled={submitting()}
                style={{
                  padding: '6px 12px',
                  'font-size': '11px',
                  'border-radius': '4px',
                  border: `1px solid ${btn.color}`,
                  background: 'transparent',
                  color: btn.color,
                  cursor: 'pointer',
                  'font-weight': '500',
                  opacity: submitting() ? 0.6 : 1,
                  transition: 'all 0.2s'
                }}
              >
                {btn.label}
              </button>
            ))
          }
        </div>

        {/* Add Note */}
        <button
          onClick={() => setShowNoteInput(!showNoteInput())}
          style={{
            padding: '6px 12px',
            'font-size': '11px',
            'border-radius': '4px',
            border: '1px solid var(--border-color)',
            background: showNoteInput() ? 'var(--bg-secondary)' : 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            'font-weight': '500',
            width: '100%',
            'text-align': 'left'
          }}
        >
          📝 {showNoteInput() ? 'Cancel Note' : 'Add Note'}
        </button>

        <Show when={showNoteInput()}>
          <div style={{ 'margin-top': '12px' }}>
            <textarea
              value={noteContent()}
              onInput={(e) => setNoteContent(e.currentTarget.value)}
              placeholder="Enter your note or additional context..."
              style={{
                width: '100%',
                'min-height': '80px',
                padding: '8px',
                'border-radius': '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                'font-size': '12px',
                resize: 'vertical',
                'font-family': 'inherit'
              }}
            />
            <button
              onClick={() => submitFeedback('note', noteContent())}
              disabled={submitting() || !noteContent()}
              style={{
                'margin-top': '8px',
                padding: '8px 16px',
                'font-size': '12px',
                'border-radius': '4px',
                border: 'none',
                background: 'var(--accent-primary)',
                color: '#000',
                cursor: 'pointer',
                'font-weight': '600',
                opacity: submitting() || !noteContent() ? 0.6 : 1
              }}
            >
              {submitting() ? 'Submitting...' : 'Submit Note'}
            </button>
          </div>
        </Show>

        {/* Result Message */}
        <Show when={feedbackResult()}>
          <div style={{
            'margin-top': '12px',
            padding: '8px 12px',
            'border-radius': '4px',
            background: feedbackResult()?.success ? '#28a74520' : '#dc354520',
            color: feedbackResult()?.success ? '#28a745' : '#dc3545',
            'font-size': '12px'
          }}>
            {feedbackResult()?.success ? '✓' : '✗'} {feedbackResult()?.message}
          </div>
        </Show>
      </div>
    </div>
  );
};

export default FeedbackButtons;

