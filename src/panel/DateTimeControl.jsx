import { panel } from '../data/panel.js'
import './DateTimeControl.css'

/* A data e a hora do cálculo, em UTC (card I4). O campo só mostra a data que recebe e avisa quando a
   pessoa muda: quem guarda a data é o App.jsx (card E14). Assim o "Now" e a data do App aparecem no
   campo sem um estado aqui dentro.

   O datetime-local não guarda fuso: "2026-11-14T03:00" é só um texto, e o new Date() leria esse
   texto no fuso do computador. Por isso o ':00Z' na leitura e o toISOString() na escrita: os dois
   sentidos ficam em UTC, a referência das missões. */
export function DateTimeControl({ dateUtc, onChange }) {
  function handleChange(event) {
    /* Data inválida (Invalid Date) derruba a tela no useSubsolarPoint (card E14, item 2). Sem o
       onChange, o campo volta na hora para a data anterior: quem manda no valor é o pai.
       O campo vazio precisa da guarda dele: o Chrome e o Node leem o ':00Z' sozinho como
       01/01/2000, e não como data inválida. O ano depois de 9999, que o campo aceita, o Date só lê
       com um + na frente (+010000-...): sem ele, dá Invalid Date. */
    if (!event.target.value) return
    const date = new Date(`${event.target.value}:00Z`)
    if (Number.isNaN(date.getTime())) return
    onChange(date)
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
