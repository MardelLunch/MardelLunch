import React, { useState, useEffect } from "react";

/* ============================================================
   MARDEL LUNCH — una sola pantalla
   Anotás el pedido, anotás el gasto (a mano o con la foto de
   la factura) y ves cuánto te quedó. Todo queda guardado.
   ============================================================ */

const CLAVE = "mardel-lunch:facil-v2";
const id = () => Math.random().toString(36).slice(2, 9);
const num = (v) => (isNaN(parseFloat(v)) ? 0 : parseFloat(v));
const pesos = (n) => "$" + Math.round(n).toLocaleString("es-AR");
const hoy = () => new Date().toISOString().slice(0, 10);
const mesDe = (f) => (f || "").slice(0, 7);
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const nombreMes = (m) => (m ? MESES[+m.split("-")[1] - 1] : "");
const tituloDia = (f) => {
  const d = new Date(f + "T12:00:00");
  const dias = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
  if (f === hoy()) return "Hoy";
  return dias[d.getDay()] + " " + f.slice(8, 10) + "/" + f.slice(5, 7);
};

/* precios POR UNIDAD */
const CARTA = [
  ["Empanadas", 1250],
  ["Canastitas", 1250],
  ["Pizzetas", 1000],
  ["Chips", 1125],
  ["Fosforitos", 1125],
  ["Albondiguitas", 1042],
  ["Salchichitas envueltas", 750],
  ["Medialunas j&q", 1292],
  ["Morenitos", 1333],
  ["Sang. de miga", 1750],
  ["Sang. de pollo", 1333],
  ["Sang. de milanesa", 1375],
  ["Sang. de carne desmechada", 1375],
  ["Tortilla de papa", 9000],
];

const conMayus = (t) => {
  const x = String(t || "").trim();
  return x ? x.charAt(0).toUpperCase() + x.slice(1) : x;
};

/* pasa una carta vieja (por docena) a precio por unidad */
const aUnidad = (p) => {
  if (p.unit) return p;
  const trae = num((String(p.nombre).match(/^\s*(\d+)/) || [])[1]) || 1;
  return {
    id: p.id,
    nombre: conMayus(String(p.nombre).replace(/^\s*\d+\s*/, "")) || conMayus(p.nombre),
    precio: Math.round(num(p.precio) / trae),
    unit: true,
  };
};

async function interpretar(contenido) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          content: contenido.concat([
            {
              type: "text",
              text:
                'Esto es un ticket de compra o alguien contando lo que gastó en insumos para un servicio de lunch en Argentina. Devolvé SOLO un JSON, sin markdown: {"comercio":"","total":0,"items":[{"detalle":"","monto":0}]}. Montos en pesos, sin puntos ni símbolos; "45 mil" son 45000, "dos lucas" son 2000. Agrupá en pocos ítems claros (carnicería, fiambrería, panificados, descartables). Si no se distinguen ítems, devolvé uno solo con el total.',
            },
          ]),
        },
      ],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  const txt = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const l = txt.replace(/```json|```/g, "").trim();
  const i = l.indexOf("{");
  return JSON.parse(i >= 0 ? l.slice(i, l.lastIndexOf("}") + 1) : l);
}

/* ============================ APP ============================ */
export default function MardelLunch() {
  const [productos, setProductos] = useState([]);
  const [movs, setMovs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [verPrecios, setVerPrecios] = useState(false);
  const [editando, setEditando] = useState(null);
  const [fecha, setFecha] = useState(hoy()); // la fecha del formulario manda
  const [dia, setDia] = useState(hoy()); // qué se está mirando: un día o el mes entero
  const [guardado, setGuardado] = useState("");

  useEffect(() => {
    // le pide al celular que no borre estos datos para hacer lugar
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const guardadoPrevio = localStorage.getItem(CLAVE);
        if (!guardadoPrevio) throw new Error("vacio");
        const d = JSON.parse(guardadoPrevio);
        setProductos((d.productos || []).map(aUnidad));
        setMovs(d.movs || []);
      } catch (e) {
        setProductos(CARTA.map(([nombre, precio]) => ({ id: id(), nombre, precio, unit: true })));
      }
      setCargando(false);
    })();
  }, []);

  useEffect(() => {
    if (cargando) return;
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ productos, movs }));
      setGuardado("Guardado");
      setTimeout(() => setGuardado(""), 1600);
    } catch (e) {
      setGuardado("No se pudo guardar");
    }
  }, [productos, movs, cargando]);

  const mes = mesDe(fecha);
  const delMes = movs.filter((m) => mesDe(m.fecha) === mes);
  const filtrados = dia ? movs.filter((m) => m.fecha === dia) : delMes;
  const entro = filtrados.filter((m) => m.tipo === "pedido").reduce((a, m) => a + num(m.monto), 0);
  const salio = filtrados.filter((m) => m.tipo === "gasto").reduce((a, m) => a + num(m.monto), 0);

  const guardar = (movsNuevos) =>
    setMovs([...movsNuevos.map((m) => ({ id: id(), ...m })), ...movs]);

  const editarMov = (mid, campo, v) => setMovs(movs.map((m) => (m.id === mid ? { ...m, [campo]: v } : m)));

  const elegirFecha = (f) => {
    if (!f) return;
    setFecha(f);
    if (dia) setDia(f);
  };

  const porDia = filtrados.reduce((acc, m) => {
    (acc[m.fecha] = acc[m.fecha] || []).push(m);
    return acc;
  }, {});
  const dias = Object.keys(porDia).sort().reverse();

  return (
    <div className="ml-app">
      <style>{CSS}</style>

      <header className="ml-head">
        <div className="ml-logo">
          mardel<span className="ml-lunch">lunch</span>
        </div>
        <div className="ml-mes">{guardado || nombreMes(mes)}</div>
      </header>

      <div className="ml-tablero">
        <div className="ml-num">
          <span>Entró</span>
          <strong className="mono">{pesos(entro)}</strong>
        </div>
        <div className="ml-num">
          <span>Salió</span>
          <strong className="mono">{pesos(salio)}</strong>
        </div>
        <div className="ml-num destacado">
          <span>Te quedó</span>
          <strong className="mono">{pesos(entro - salio)}</strong>
        </div>
      </div>

      <main className="ml-main">
        {cargando ? (
          <p className="ml-vacio">Un segundito…</p>
        ) : (
          <>
            {filtrados.length === 0 && movs.length > 0 && (
              <div className="ml-cartel">
                No hay nada cargado en {dia ? tituloDia(dia).toLowerCase() : nombreMes(mes)}. Cambiá la fecha acá abajo.
              </div>
            )}

            <Pedido productos={productos} onGuardar={guardar} fecha={fecha} setFecha={elegirFecha} />
            <Gasto onGuardar={guardar} fecha={fecha} setFecha={elegirFecha} />

            {filtrados.length > 0 && (
              <section className="ml-bloque">
                <div className="ml-fila-h2">
                  <h2 className="ml-h2">{dia ? tituloDia(dia) : nombreMes(mes)}</h2>
                  <button className="ml-link" onClick={() => setDia(dia ? null : fecha)}>
                    {dia ? "Ver el mes entero" : "Ver solo ese día"}
                  </button>
                </div>
                <p className="ml-nota">Tocá cualquier renglón para corregirlo o borrarlo.</p>
                {dias.map((f) => {
                  const total = porDia[f].reduce((a, m) => a + (m.tipo === "gasto" ? -num(m.monto) : num(m.monto)), 0);
                  return (
                    <div className="ml-dia" key={f}>
                      <div className="ml-dia-tit">
                        <span>{tituloDia(f)}</span>
                        <span className={"mono " + (total >= 0 ? "verde" : "rojo")}>{pesos(total)}</span>
                      </div>
                      {porDia[f].map((m) =>
                        editando === m.id ? (
                          <div className="ml-editar" key={m.id}>
                            <input
                              className="ml-input"
                              value={m.detalle}
                              onChange={(e) => editarMov(m.id, "detalle", e.target.value)}
                              placeholder="Qué fue"
                            />
                            <div className="ml-gasto">
                              <input
                                className="ml-input mono"
                                type="number"
                                inputMode="numeric"
                                value={m.monto}
                                onChange={(e) => editarMov(m.id, "monto", e.target.value)}
                              />
                              <input
                                className="ml-input"
                                type="date"
                                value={m.fecha}
                                onChange={(e) => editarMov(m.id, "fecha", e.target.value)}
                              />
                            </div>
                            <div className="ml-row">
                              <button className="ml-cta" onClick={() => setEditando(null)}>Listo</button>
                              <button
                                className="ml-borrar-todo"
                                onClick={() => {
                                  setMovs(movs.filter((x) => x.id !== m.id));
                                  setEditando(null);
                                }}
                              >
                                Borrar este
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="ml-mov editable" key={m.id} onClick={() => setEditando(m.id)}>
                            <span className="ml-detalle">{m.detalle}</span>
                            <span className={"mono ml-monto " + m.tipo}>
                              {m.tipo === "gasto" ? "−" : "+"}
                              {pesos(num(m.monto))}
                            </span>
                            <span className="ml-lapiz">✎</span>
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </section>
            )}

            <button className="ml-link" onClick={() => setVerPrecios(!verPrecios)}>
              {verPrecios ? "Listo" : "Mis precios"}
            </button>
            {verPrecios && <Precios productos={productos} setProductos={setProductos} />}

            {movs.length > 0 && (
              <button
                className="ml-link"
                onClick={() => {
                  const filas = [["fecha", "tipo", "detalle", "monto"], ...movs.map((m) => [m.fecha, m.tipo, '"' + String(m.detalle).replace(/"/g, "") + '"', num(m.monto)])];
                  const blob = new Blob(["\uFEFF" + filas.map((f) => f.join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = "mardel-lunch.csv";
                  a.click();
                }}
              >
                Bajar todo en Excel
              </button>
            )}

            {movs.length > 0 && (
              <button
                className="ml-borrar-todo"
                onClick={() => {
                  if (window.confirm("¿Borrar los " + movs.length + " movimientos cargados? No se puede deshacer. Bajá el Excel antes si querés guardarlos.")) setMovs([]);
                }}
              >
                Borrar todo lo cargado
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* ------------------------- EL PEDIDO ------------------------- */
function Pedido({ productos, onGuardar, fecha, setFecha }) {
  const [cant, setCant] = useState({});
  const [cliente, setCliente] = useState("");

  const total = productos.reduce((a, p) => a + num(p.precio) * (cant[p.id] || 0), 0);
  const elegidos = productos.filter((p) => cant[p.id]);
  const mover = (pid, d) => setCant({ ...cant, [pid]: Math.max(0, (cant[pid] || 0) + d) });

  const guardar = () => {
    if (!total) return;
    onGuardar([
      {
        tipo: "pedido",
        fecha,
        detalle: cliente.trim() || elegidos.map((p) => `${cant[p.id]}× ${p.nombre}`).join(", "),
        monto: total,
      },
    ]);
    setCant({});
    setCliente("");
  };

  return (
    <section className="ml-bloque">
      <h2 className="ml-h2">Anotar un pedido</h2>
      <div className="ml-lista">
        {productos.map((p) => (
          <div className={"ml-prod" + (cant[p.id] ? " activo" : "")} key={p.id}>
            <div className="ml-prod-txt">
              <strong>{conMayus(p.nombre)}</strong>
              <span className="mono">{pesos(num(p.precio))} c/u</span>
            </div>
            <div className="ml-stepper">
              <button onClick={() => mover(p.id, -1)} disabled={!cant[p.id]} aria-label={"Quitar " + p.nombre}>−</button>
              <input
                className="ml-cant mono"
                type="number"
                inputMode="numeric"
                min="0"
                value={cant[p.id] || ""}
                placeholder="0"
                onChange={(e) => setCant({ ...cant, [p.id]: Math.max(0, Math.round(num(e.target.value))) })}
                aria-label={"Cantidad de " + p.nombre}
              />
              <button onClick={() => mover(p.id, 1)} aria-label={"Agregar " + p.nombre}>+</button>
            </div>
          </div>
        ))}
      </div>

      {total > 0 && (
        <div className="ml-cierre">
          <div className="ml-gasto">
            <input className="ml-input" placeholder="Para quién (opcional)" value={cliente} onChange={(e) => setCliente(e.target.value)} />
            <input className="ml-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <button className="ml-cta ancho" onClick={guardar}>
            Guardar pedido de {pesos(total)}
          </button>
        </div>
      )}
    </section>
  );
}

/* -------------------------- EL GASTO -------------------------- */
function Gasto({ onGuardar, fecha, setFecha }) {
  const [detalle, setDetalle] = useState("");
  const [monto, setMonto] = useState("");
  const [estado, setEstado] = useState("");
  const [lectura, setLectura] = useState(null);
  const [texto, setTexto] = useState("");
  const [grabando, setGrabando] = useState(false);
  const recRef = React.useRef(null);
  const hayVoz = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const guardar = () => {
    if (!num(monto)) return;
    onGuardar([{ tipo: "gasto", fecha, detalle: detalle.trim() || "Gasto", monto: num(monto) }]);
    setDetalle("");
    setMonto("");
  };

  const procesar = async (contenido) => {
    setEstado("Anotando…");
    setLectura(null);
    try {
      setLectura(await interpretar(contenido));
      setEstado("");
    } catch (e) {
      const m = String(e.message || "");
      setEstado(
        m.includes("ANTHROPIC_API_KEY")
          ? "Falta cargar la API key en Vercel (Settings → Environment Variables) y hacer Redeploy."
          : m.includes("credit") || m.includes("balance")
          ? "La cuenta de la API se quedó sin saldo. Cargá crédito en console.anthropic.com."
          : "No pude leerlo (" + (m || "sin conexión") + "). Cargalo a mano abajo."
      );
    }
  };

  const dictar = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return setEstado("Este navegador no tiene dictado. Probá con Chrome en el celular.");
    if (grabando) return recRef.current && recRef.current.stop();
    const r = new SR();
    r.lang = "es-AR";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
      setTexto((prev) => (prev ? prev + " " + t : t));
    };
    r.onend = () => setGrabando(false);
    r.onerror = (e) =>
      setEstado(
        e.error === "not-allowed"
          ? "Tenés que permitir el micrófono en el navegador."
          : "El micrófono no está disponible acá. Escribilo abajo y sale igual."
      );
    recRef.current = r;
    setEstado("");
    r.start();
    setGrabando(true);
  };

  const procesarFoto = async (file) => {
    if (!file) return;
    setEstado("Leyendo la factura…");
    try {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      procesar([{ type: "image", source: { type: "base64", media_type: file.type || "image/jpeg", data: b64 } }]);
    } catch (e) {
      setEstado("No pude abrir la foto.");
    }
  };

  const guardarLectura = () => {
    const items = (lectura.items || []).filter((i) => num(i.monto) > 0);
    const lista = items.length
      ? items.map((i) => ({ tipo: "gasto", fecha, detalle: i.detalle || lectura.comercio || "Gasto", monto: num(i.monto) }))
      : [{ tipo: "gasto", fecha, detalle: lectura.comercio || "Gasto", monto: num(lectura.total) }];
    onGuardar(lista);
    setLectura(null);
    setTexto("");
  };

  return (
    <section className="ml-bloque">
      <h2 className="ml-h2">Anotar un gasto</h2>

      <button className={"ml-dictar" + (grabando ? " on" : "")} onClick={dictar}>
        {grabando ? "● Escuchando… tocá para terminar" : "Contame lo que gastaste"}
      </button>

      {texto && (
        <>
          <textarea className="ml-input area" rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} />
          <div className="ml-row">
            <button className="ml-cta" onClick={() => procesar([{ type: "text", text: texto }])}>Anotar esto</button>
            <button className="ml-link" onClick={() => setTexto("")}>Borrar</button>
          </div>
        </>
      )}

      <div className="ml-row separado">
        <label className="ml-foto">
          Sacar foto
          <input type="file" accept="image/*" capture="environment" onChange={(e) => procesarFoto(e.target.files[0])} />
        </label>
        <label className="ml-foto claro">
          Subir factura
          <input type="file" accept="image/*" onChange={(e) => procesarFoto(e.target.files[0])} />
        </label>
      </div>
      {estado && <p className="ml-nota">{estado}</p>}

      {lectura && (
        <div className="ml-lectura">
          <div className="ml-lectura-tit">{lectura.comercio || "Factura"}</div>
          {(lectura.items || []).map((i, k) => (
            <div className="ml-linea" key={k}>
              <span>{i.detalle}</span>
              <span className="ml-punteado" />
              <span className="mono">{pesos(num(i.monto))}</span>
            </div>
          ))}
          <div className="ml-linea total">
            <span>Total</span>
            <span className="ml-punteado" />
            <span className="mono">{pesos(num(lectura.total) || (lectura.items || []).reduce((a, i) => a + num(i.monto), 0))}</span>
          </div>
          <div className="ml-row arriba">
            <button className="ml-cta" onClick={guardarLectura}>Guardar</button>
            <button className="ml-link claro" onClick={() => setLectura(null)}>Descartar</button>
          </div>
        </div>
      )}

      <p className="ml-nota">O cargalo a mano:</p>
      <div className="ml-gasto">
        <input className="ml-input" placeholder="Carnicería, fiambre, bandejas…" value={detalle} onChange={(e) => setDetalle(e.target.value)} />
        <input className="ml-input mono corto" type="number" inputMode="numeric" placeholder="$" value={monto} onChange={(e) => setMonto(e.target.value)} />
      </div>
      <div className="ml-gasto">
        <input className="ml-input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <button className="ml-cta" onClick={guardar} disabled={!num(monto)}>Guardar</button>
      </div>
    </section>
  );
}

/* --------------------------- PRECIOS --------------------------- */
function Precios({ productos, setProductos }) {
  const editar = (pid, campo, v) => setProductos(productos.map((p) => (p.id === pid ? { ...p, [campo]: v } : p)));
  return (
    <section className="ml-bloque">
      <p className="ml-nota">Precio de UNA unidad. Una docena se cobra sola: 12 × el precio.</p>
      {productos.map((p) => (
        <div className="ml-precio" key={p.id}>
          <input className="ml-plano" value={p.nombre} onChange={(e) => editar(p.id, "nombre", conMayus(e.target.value))} />
          <input className="ml-plano mono corto" type="number" value={p.precio} onChange={(e) => editar(p.id, "precio", e.target.value)} />
          <button className="ml-x" onClick={() => setProductos(productos.filter((x) => x.id !== p.id))}>×</button>
        </div>
      ))}
      <button className="ml-link" onClick={() => setProductos([...productos, { id: id(), nombre: "", precio: "", unit: true }])}>
        + Agregar producto
      </button>
    </section>
  );
}

/* ---------------------------- CSS ---------------------------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,600..900,100,1&family=Inter:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap');

.ml-app{--azul:#1B4CA1;--azulOscuro:#123A80;--naranja:#F2894A;--naranjaSuave:#F9AE80;--crema:#EFEDE4;--papel:#F7F5EE;--humo:#8B93A8;
 font-family:Inter,system-ui,sans-serif;background:var(--papel);color:var(--azulOscuro);min-height:100vh;padding-bottom:48px;}
.ml-app *{box-sizing:border-box;}
.mono{font-family:'Space Mono',ui-monospace,monospace;font-variant-numeric:tabular-nums;}

.ml-head{display:flex;justify-content:space-between;align-items:center;padding:16px 18px 10px;background:var(--azul);color:#fff;}
.ml-logo{font-family:Fraunces,Georgia,serif;font-weight:900;font-size:28px;letter-spacing:-.02em;}
.ml-lunch{font-family:'Space Mono',monospace;font-weight:700;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:var(--naranja);vertical-align:super;margin-left:5px;}
.ml-mes{font-family:'Space Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--naranjaSuave);}

.ml-tablero{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(255,255,255,.2);}
.ml-num{background:var(--azul);color:#fff;padding:12px 10px 16px;text-align:center;}
.ml-num span{display:block;font-family:'Space Mono',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#B9CBE8;margin-bottom:4px;}
.ml-num strong{font-size:17px;}
.ml-num.destacado strong{color:var(--naranja);}

.ml-main{padding:16px 14px;display:flex;flex-direction:column;gap:14px;max-width:640px;margin:0 auto;}
.ml-bloque{background:#fff;border:1px solid var(--crema);border-radius:18px;padding:14px;}
.ml-h2{font-family:Fraunces,serif;font-size:19px;font-weight:800;margin:0 0 12px;}
.ml-fila-h2{display:flex;justify-content:space-between;align-items:baseline;}
.ml-vacio{color:var(--humo);text-align:center;padding:30px;}
.ml-nota{font-size:13px;color:var(--humo);margin:12px 0 6px;}

.ml-lista{display:flex;flex-direction:column;}
.ml-prod{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--crema);}
.ml-prod:last-child{border-bottom:0;}
.ml-prod-txt strong{display:block;font-size:15px;font-weight:500;}
.ml-prod-txt span{font-size:12.5px;color:var(--humo);}
.ml-prod.activo .ml-prod-txt strong{color:var(--azul);font-weight:600;}
.ml-stepper{display:flex;align-items:center;gap:2px;flex:0 0 auto;}
.ml-stepper button{width:40px;height:40px;border-radius:50%;border:1.5px solid var(--crema);background:#fff;color:var(--azul);font-size:22px;line-height:1;cursor:pointer;font-family:inherit;}
.ml-stepper button:disabled{opacity:.3;}
.ml-cant{width:56px;text-align:center;font-size:17px;font-weight:700;border:1px solid var(--crema);border-radius:10px;padding:8px 2px;background:#fff;color:var(--azulOscuro);font-family:'Space Mono',monospace;}

.ml-cierre{margin-top:14px;display:flex;flex-direction:column;gap:8px;}
.ml-gasto{display:grid;grid-template-columns:1fr 118px;gap:8px;margin-bottom:8px;}
.ml-input{width:100%;font-family:inherit;font-size:16px;padding:12px;border:1px solid var(--crema);border-radius:12px;background:var(--papel);color:var(--azulOscuro);}
.ml-input.corto{text-align:right;}
.ml-row{display:flex;gap:8px;flex-wrap:wrap;}
.ml-row.arriba{margin-top:12px;}
.ml-cta{background:var(--naranja);color:#fff;border:0;border-radius:99px;padding:14px 22px;font-size:15px;font-weight:600;font-family:inherit;cursor:pointer;}
.ml-cta.ancho{width:100%;}
.ml-cta:disabled{opacity:.4;}
.ml-foto{background:var(--azul);color:#fff;border-radius:99px;padding:14px 22px;font-size:15px;font-weight:600;cursor:pointer;position:relative;overflow:hidden;display:inline-block;flex:1;text-align:center;min-width:130px;}
.ml-foto.claro{background:#fff;color:var(--azul);border:1.5px solid var(--azul);}
.ml-foto input{position:absolute;inset:0;opacity:0;cursor:pointer;}
.ml-link{background:none;border:0;color:var(--azul);font-family:inherit;font-size:14px;font-weight:600;text-decoration:underline;cursor:pointer;padding:6px;}
.ml-link.claro{color:#fff;}

.ml-lectura{background:var(--azul);color:#fff;border-radius:14px;padding:14px;margin-top:12px;}
.ml-lectura-tit{font-family:'Space Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--naranjaSuave);margin-bottom:8px;}
.ml-linea{display:flex;align-items:center;gap:6px;font-size:13.5px;padding:3px 0;}
.ml-punteado{flex:1;border-bottom:1px dotted currentColor;opacity:.35;}
.ml-linea.total{font-weight:700;border-top:1px solid rgba(255,255,255,.2);margin-top:6px;padding-top:8px;}

.ml-dia{margin-bottom:14px;}
.ml-dia-tit{display:flex;justify-content:space-between;font-family:'Space Mono',monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--humo);border-bottom:1.5px solid var(--crema);padding-bottom:5px;margin-bottom:4px;}
.ml-dia-tit .verde{color:#2E7D4F;} .ml-dia-tit .rojo{color:#C7452F;}
.ml-mov{display:grid;grid-template-columns:1fr auto 30px;align-items:center;gap:6px;padding:7px 0;font-size:14px;}
.ml-detalle{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ml-monto{font-size:13.5px;font-weight:700;}
.ml-monto.gasto{color:#C7452F;}
.ml-monto.pedido{color:#2E7D4F;}
.ml-x{background:none;border:0;color:var(--humo);font-size:19px;cursor:pointer;padding:2px 6px;}

.ml-precio{display:grid;grid-template-columns:1fr 100px 30px;align-items:center;gap:4px;border-bottom:1px solid var(--crema);}
.ml-plano{border:0;background:transparent;font-family:inherit;font-size:15px;color:var(--azulOscuro);padding:10px 0;width:100%;}
.ml-plano.corto{text-align:right;}

.ml-dictar{width:100%;background:var(--azul);color:#fff;border:0;border-radius:14px;padding:16px;font-size:16px;font-weight:600;font-family:inherit;cursor:pointer;margin-bottom:10px;}
.ml-dictar.on{background:#C7452F;animation:mlPulso 1.2s ease-in-out infinite;}
@keyframes mlPulso{0%,100%{opacity:1;}50%{opacity:.7;}}
.ml-input.area{resize:vertical;line-height:1.45;margin-bottom:8px;}
.ml-row.separado{margin-top:12px;}
.ml-cartel{background:#fff;border-left:4px solid var(--naranja);border-radius:0 12px 12px 0;padding:12px 14px;font-size:14px;line-height:1.5;}
.ml-cartel .ml-link{padding:0;font-size:14px;}
.ml-borrar-todo{background:none;border:0;color:#C7452F;font-family:inherit;font-size:13px;cursor:pointer;padding:10px;align-self:center;}
.ml-mov.editable{cursor:pointer;}
.ml-lapiz{color:var(--humo);font-size:14px;text-align:center;}
.ml-editar{background:var(--papel);border:1px solid var(--crema);border-radius:12px;padding:10px;margin:6px 0;display:flex;flex-direction:column;gap:8px;}
.ml-editar .ml-gasto{margin-bottom:0;}
.ml-app :focus-visible{outline:2px solid var(--naranja);outline-offset:2px;}
`;
