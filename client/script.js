alet espaciosOcupados = []; // Guardaremos aquí los datos para validar clics

async function actualizarMapa() {
    const response = await fetch("/spaces");
    espaciosOcupados = await response.json();

    espaciosOcupados.forEach(espacio => {
        if (espacio.imageUrl) {
            const img = new Image();
            img.src = espacio.imageUrl;
            
            // Esperamos a que la imagen cargue para dibujarla
            img.onload = () => {
                ctx.drawImage(img, espacio.x, espacio.y, espacio.width, espacio.height);
            };
            
            // Si la imagen falla (link roto), dibujamos un cuadro gris
            img.onerror = () => {
                ctx.fillStyle = "#ccc";
                ctx.fillRect(espacio.x, espacio.y, espacio.width, espacio.height);
            };
        } else {
            // Si no tiene imagen, un color por defecto
            ctx.fillStyle = "blue";
            ctx.fillRect(espacio.x, espacio.y, espacio.width, espacio.height);
        }
    });
}
// Ejecutar al cargar la página
window.onload = actualizarMapa;