'use client';

/**
 * /dev/voice — Person B's integration test bench (NOT the product UI).
 * Exercises every hook Jacob will wire: voice session, captions, amplitude,
 * photo scan → editable proposal → confirm/reject, persisted inventory + reload.
 */
import React, { useRef, useState } from 'react';
import { useEchoVoice } from '@/hooks/useEchoVoice';
import { useSupplyScan } from '@/hooks/useSupplyScan';
import { useInventory } from '@/hooks/useInventory';
import { VoiceInputButton } from '@/components/voice/VoiceInputButton';
import type { FillLevel } from '@/types/echo';

const FILLS: (FillLevel | '')[] = ['', 'full', 'three_quarters', 'half', 'quarter', 'empty'];

export default function VoiceDevPage() {
  const inv = useInventory();
  const voice = useEchoVoice();
  const scan = useSupplyScan({
    confirmProposal: inv.confirmProposal,
    onConfirmed: (r) =>
      voice.notify(`The survivor confirmed a scan. Inventory saved. Water now ${r.totals.waterLiters} L.`, { respond: false }),
  });
  const [text, setText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const box: React.CSSProperties = { border: '1px solid #334', borderRadius: 8, padding: 12, marginBottom: 12 };

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: 16, fontFamily: 'ui-monospace, monospace', fontSize: 13, color: '#dde' }}>
      <h1 style={{ fontSize: 18, marginBottom: 8 }}>ECHO dev bench — Person B</h1>

      {/* VOICE */}
      <section style={box}>
        <b>Voice</b> · mode: {voice.mode ?? '—'} · status: <b>{voice.status}</b> · avatar: {voice.avatarStatus}
        <div style={{ height: 10, background: '#223', margin: '8px 0', borderRadius: 4 }}>
          <div style={{ width: `${Math.round(voice.amplitude * 100)}%`, height: '100%', background: '#0ef', borderRadius: 4, transition: 'width 40ms' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => voice.connect()} style={btn}>Connect</button>
          <button onClick={() => voice.disconnect()} style={btn}>Disconnect</button>
          <VoiceInputButton voice={voice} />
          {voice.error?.code === 'playback_failed' && <button onClick={() => voice.resumePlayback()} style={btn}>Enable audio</button>}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void voice.sendText(text);
            setText('');
          }}
          style={{ display: 'flex', gap: 8, marginTop: 8 }}
        >
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type to ECHO…" style={{ ...input, flex: 1 }} />
          <button style={btn}>Send</button>
        </form>
        {voice.error && (
          <p style={{ color: '#f67', marginTop: 8 }}>
            [{voice.error.code}] {voice.error.message} <button onClick={voice.clearError} style={btn}>x</button>
          </p>
        )}
        <div style={{ maxHeight: 220, overflowY: 'auto', marginTop: 8 }}>
          {voice.captions.map((c) => (
            <div key={c.id} style={{ opacity: c.final ? 1 : 0.6 }}>
              <b>{c.role === 'user' ? 'YOU' : 'ECHO'}:</b> {c.text}
            </div>
          ))}
        </div>
      </section>

      {/* SCAN */}
      <section style={box}>
        <b>Scan</b> · status: <b>{scan.status}</b> {scan.mock && <span style={{ color: '#fb3' }}>(offline fixture)</span>}
        <div style={{ marginTop: 8 }}>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={(e) => e.target.files?.[0] && scan.scanPhoto(e.target.files[0])} />
        </div>
        {scan.error && <p style={{ color: '#f67' }}>[{scan.error.code}] {scan.error.message}</p>}
        {scan.previewUrl && <img src={scan.previewUrl} alt="scan preview" style={{ maxHeight: 160, marginTop: 8 }} />}
        {scan.proposal && (
          <div style={{ marginTop: 8 }}>
            <p>{scan.proposal.summary}</p>
            {scan.proposal.items.map((it, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 6, margin: '6px 0' }}>
                <input style={input} value={it.name} onChange={(e) => scan.updateItem(i, { name: e.target.value })} />
                <input style={input} type="number" min={1} value={it.quantity} onChange={(e) => scan.updateItem(i, { quantity: Number(e.target.value) })} />
                <input style={input} type="number" placeholder="mL each (unknown)" value={it.unitVolumeMl ?? ''} onChange={(e) => scan.updateItem(i, { unitVolumeMl: e.target.value ? Number(e.target.value) : null })} />
                <select style={input} value={it.fillLevel ?? ''} onChange={(e) => scan.updateItem(i, { fillLevel: (e.target.value || null) as FillLevel | null })}>
                  {FILLS.map((f) => <option key={f} value={f}>{f || 'fill: unknown'}</option>)}
                </select>
                <input style={input} placeholder="location (unknown)" value={it.location ?? ''} onChange={(e) => scan.updateItem(i, { location: e.target.value || null })} />
                <small style={{ gridColumn: '1/-1', opacity: 0.7 }}>
                  drinkability: {it.drinkability} · {it.observations.join('; ')}
                </small>
              </div>
            ))}
            <small style={{ opacity: 0.7 }}>{scan.proposal.uncertaintyNotes.join(' ')}</small>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button style={btn} disabled={scan.status === 'saving'} onClick={() => scan.confirm()}>Confirm</button>
              <button style={btn} onClick={() => { void scan.confirm(); void scan.confirm(); }}>Double-confirm test</button>
              <button style={btn} onClick={() => scan.reject()}>Reject</button>
            </div>
          </div>
        )}
        {scan.receipt && (
          <p style={{ color: '#5e9' }}>
            Saved ✓ receipt {scan.receipt.proposalId} {scan.receipt.duplicate ? '(duplicate, not re-applied)' : ''} · water {scan.receipt.totals.waterLiters} L
          </p>
        )}
      </section>

      {/* INVENTORY */}
      <section style={box}>
        <b>Inventory (persisted)</b> · water <b>{inv.totals.waterLiters} L</b> in {inv.totals.waterContainers} containers
        {inv.totals.waterContainersUnknownVolume > 0 && ` (${inv.totals.waterContainersUnknownVolume} unknown volume)`}
        {inv.error && <p style={{ color: '#f67' }}>[{inv.error.code}] {inv.error.message}</p>}
        <ul style={{ marginTop: 6 }}>
          {inv.items.map((i) => (
            <li key={i.id}>
              {i.quantity} × {i.name} {i.unitVolumeMl ? `· ${i.unitVolumeMl} mL` : ''} {i.fillLevel ? `· ${i.fillLevel}` : ''} {i.location ? `· @ ${i.location}` : ''}
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btn} onClick={() => location.reload()}>Reload page</button>
          <button
            style={btn}
            onClick={() => inv.applyAction({ type: 'inventory_update', operation: 'clear', item: { name: '', category: 'other', quantity: 0, unit: '', source: 'manual' } })}
          >
            Clear inventory
          </button>
        </div>
      </section>
    </main>
  );
}

const btn: React.CSSProperties = { border: '1px solid #0ef6', background: '#0b1622', color: '#0ef', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' };
const input: React.CSSProperties = { background: '#0b1622', border: '1px solid #334', color: '#dde', padding: '5px 8px', borderRadius: 6 };
