"use client";

const NUMS = [];
for (let n = 2; n <= 12; n++) NUMS.push(n);

/* Inline collapsible table panel. Non-blocking: the question and answer input
   stay visible and usable while it is open. Plain by design: no highlighting,
   the student finds the intersection alone. */
export default function TablePanel({ open }) {
  return (
    <div className={open ? "tablepanel open" : "tablepanel"} aria-hidden={!open}>
      <table>
        <thead>
          <tr>
            <th></th>
            {NUMS.map((b) => (
              <th key={b}>{b}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {NUMS.map((a) => (
            <tr key={a}>
              <th>{a}</th>
              {NUMS.map((b) => (
                <td key={b}>{a * b}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
