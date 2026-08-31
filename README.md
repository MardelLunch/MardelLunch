# Mardel Lunch — de esta carpeta a tu celular

Son 3 pasos. La primera vez lleva unos 15 minutos. Después nunca más.

---

## PASO 1 · Subir el código a GitHub

Hacelo desde la computadora, es más cómodo.

1. Entrá a **github.com** y creá una cuenta (gratis).
2. Botón verde **New** → nombre: `mardel-lunch` → marcá **Private** → **Create repository**.
3. En la pantalla que aparece, tocá el link **uploading an existing file**.
4. Descomprimí el zip y arrastrá TODO lo que está adentro de la carpeta: `src`, `public`, `api`, `index.html`, `package.json`, `vite.config.js`, `.gitignore`, `README.md`.
5. Abajo, botón **Commit changes**.

---

## PASO 2 · Publicarla con Vercel

1. Entrá a **vercel.com** → **Sign up** → elegí **Continue with GitHub**.
2. **Add New → Project**.
3. Al lado de `mardel-lunch`, botón **Import**.
4. No toques ninguna configuración. Vercel se da cuenta solo.
5. **Deploy**.

Esperá un minuto. Te va a dar un link tipo `mardel-lunch.vercel.app`.
**Ese link ya es tu app.** Abrilo del celular y probala.

---

## PASO 3 · Que quede como app en la pantalla del celu

**Android (Chrome)**
1. Abrí tu link.
2. Menú de los tres puntos, arriba a la derecha.
3. **Agregar a pantalla principal** → **Instalar**.

**iPhone (Safari — tiene que ser Safari, no Chrome)**
1. Abrí tu link.
2. Botón compartir (el cuadradito con la flecha para arriba).
3. Bajá y tocá **Agregar a inicio** → **Agregar**.

Queda con el ícono de la conservadora, abre en pantalla completa, sin barra del navegador. Igual que cualquier app.

---

## Extra · Activar la foto de la factura y el dictado inteligente

Sin esto la app anda igual: pedidos, gastos a mano, totales y Excel. Lo que no funciona es leer facturas ni interpretar lo que dictás.

1. Entrá a **console.anthropic.com** → **API Keys** → **Create Key** → copiala.
2. En **Billing**, cargá saldo (con 5 dólares te dura meses).
3. En Vercel: tu proyecto → **Settings** → **Environment Variables**.
4. Agregá una:
   - Name: `ANTHROPIC_API_KEY`
   - Value: la key que copiaste
   - **Save**
5. Andá a **Deployments** → en el primero de la lista, los tres puntos → **Redeploy**.

---

## Cosas para saber

**El dictado.** Tocás "Contame lo que gastaste" y el celular te va a pedir permiso para el micrófono: dale que sí. En Chrome de Android anda perfecto. En iPhone, Safari no tiene dictado propio, pero usás el microfonito del teclado en el campo de texto y es lo mismo.

**Dónde viven los datos.** En el navegador del celular donde la instalaste. No se sincroniza con la computadora. Si borrás los datos del navegador o cambiás de teléfono, se pierden: por eso está **Bajar todo en Excel** al final de la pantalla. Bajalo una vez por mes y quedás cubierto.

**Los precios** se cambian desde "Mis precios", sin tocar el código.

**Si querés que se sincronice** entre celu y compu, avisame y le agregamos una base de datos gratis de Vercel.
