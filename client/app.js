canvas.addEventListener("click", (e) => {
    const mouseX = e.offsetX;
    const mouseY = e.offsetY;
canvas.addEventListener("click", (e) => {
    // ... tu lógica de x e y ...
    
    // Supongamos que por ahora compras bloques de 10x10
    const w = 10; 
    const h = 10;
    const precio = w * h * 25; // 10 * 10 * 50 = 5000 ARS

    document.getElementById("coords-info").innerText = `X: ${x}, Y: ${y} (${w}x${h}px)`;
    document.getElementById("display-price").innerText = `$${precio}`; // Mostrar al usuario
    
    form.style.display = "block";
    overlay.style.display = "block";
});

    // Verificar si el clic cayó dentro de algún espacio ya comprado
    const estaOcupado = espaciosOcupados.some(espacio => {
        return mouseX >= espacio.x && 
               mouseX <= (espacio.x + espacio.width) &&
               mouseY >= espacio.y && 
               mouseY <= (espacio.y + espacio.height);
    });

    if (estaOcupado) {
        alert("¡Ups! Este espacio ya tiene dueño. Elige otro lugar.");
        return; // Detenemos la función aquí
    }  
  const width = parseInt(prompt("Ancho (min 10):", "10"));
  const height = parseInt(prompt("Alto (min 10):", "10"));
  const email = prompt("Tu email para el recibo:");

  if (!width || !height || !email) return;

  const monto = width * height * 25;

  const res = await fetch("/create-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ x, y, width, height, email, amount: monto })
  });

  const data = await res.json();
  if (data.init_point) {
    window.location.href = data.init_point; // Redirige a Mercado Pago
  }
});