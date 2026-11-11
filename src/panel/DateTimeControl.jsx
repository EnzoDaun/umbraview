import { panel } from '../data/panel.js'
import './DateTimeControl.css'

/* A data e a hora do cálculo, em UTC (card I4). O campo só mostra a data que recebe e avisa quando a
   pessoa muda: quem guarda a data é o App.jsx (card E11). Assim o "Now" e a data do App aparecem no
   campo sem um estado aqui dentro.

   O datetime-local não guarda fuso: "2026-11-14T03:00" é só um texto, e o new Date() leria esse
   texto no fuso do computador. Por isso o ':00Z' na leitura e o toISOString() na escrita: os dois
   sentidos ficam em UTC, a referência das missões. */
export function DateTimeControl({ dateUtc, onChange }) {
  function handleChange(event) {
    /* Campo vazio daria Invalid Date, e o useSubsolarPoint derruba a tela com ela (card E11, item
       2). Sem o onChange, o campo volta na hora para a data anterior: quem manda no valor é o pai. */
    if (!event.target.value) return
    onChange(new Date(`${event.target.value}:00Z`))
  }

  // O botão fica fora do <label>: rótulo com outro controle dentro deixa de ser rótulo de um só.
  return (
    <div className="date-time-control">
      <label className="date-time-control__label">
        {panel.dateTimeLabel}
        <input
          className="date-time-control__input"
          type="datetime-local"
          value={dateUtc.toISOString().slice(0, 16)}
          onChange={handleChange}
        />
      </label>
      <button
        className="date-time-control__now"
        type="button"
        onClick={() => onChange(new Date())}
      >
        {panel.dateTimeNow}
      </button>
    </div>
  )
}
