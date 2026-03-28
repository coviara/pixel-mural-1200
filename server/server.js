const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const { MercadoPagoConfig, Preference } = require("mercadopago");

const app = express();
const PORT = process.env.PORT || 3000;
// En producción, Render usará la URL real; en local, usa localhost.
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

// Modelo de Base de Datos
const Space = mongoose.model("Space", new mongoose.Schema({
    x: Number, y: Number, width: Number, height: Number,
    buyerEmail: String, imageUrl: String,
    status: { type: String, default: "pending" }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadDir));
app.use(express.static(path.join(__dirname, "../client")));

// Rutas API
app.get("/spaces", async (req, res) => {
    try {
        const spaces = await Space.find({ status: "approved" });
        res.json(spaces);
    } catch (err) { res.status(500).json(err); }
});

app.post("/create-payment", upload.single("logo"), async (req, res) => {
    try {
        const { x, y, width, height, email } = req.body;
        const nx = parseInt(x), ny = parseInt(y), nw = parseInt(width), nh = parseInt(height);

        // Validación de colisión en el servidor
        const ocupados = await Space.find({ status: "approved" });
        const estaOcupado = ocupados.some(logo => {
            return !(nx + nw <= logo.x || nx >= logo.x + logo.width || 
                     ny + nh <= logo.y || ny >= logo.y + logo.height);
        });

        if (estaOcupado) return res.status(400).json({ error: "Espacio ocupado" });

        const space = await Space.create({
            x: nx, y: ny, width: nw, height: nh,
            buyerEmail: email,
            imageUrl: `/uploads/${req.file.filename}`, // RUTA RELATIVA: Clave para evitar errores de conexión
            status: "pending"
        });

        const preference = new Preference(client);
        const response = await preference.create({
            body: {
                items: [{
                    title: `Mural: ${nw}x${nh}px`,
                    unit_price: nw * nh * 50,
                    quantity: 1,
                    currency_id: "ARS"
                }],
                metadata: { space_id: space._id.toString() },
                notification_url: `${BASE_URL}/webhook`,
                back_urls: { success: BASE_URL, failure: BASE_URL },
                auto_return: "approved"
            }
        });

        res.json({ init_point: response.init_point });
    } catch (err) { res.status(500).json({ error: "Error de servidor" }); }
});

app.post("/webhook", async (req, res) => {
    const paymentId = req.query.id || (req.body.data && req.body.data.id);
    if (paymentId) {
        try {
            const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` }
            });
            const payment = await mpRes.json();
            if (payment.status === "approved") {
                await Space.findByIdAndUpdate(payment.metadata.space_id, { status: "approved" });
            }
        } catch (e) { console.error("Webhook Error", e); }
    }
    res.sendStatus(200);
});

mongoose.connect(process.env.MONGO_URI).then(() => {
    app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));
});