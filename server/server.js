const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const { MercadoPagoConfig, Preference } = require("mercadopago");

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = "https://romelia-ridgepoled-johnna.ngrok-free.dev"; // CAMBIAR POR TU URL DE NGROK

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

const Space = mongoose.model("Space", new mongoose.Schema({
    x: Number, y: Number, width: Number, height: Number,
    buyerEmail: String, imageUrl: String,
    status: { type: String, default: "pending" }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadDir));
app.use(express.static(path.join(__dirname, "../client")));

app.get("/spaces", async (req, res) => {
    try {
        const spaces = await Space.find({ status: "approved" });
        res.json(spaces);
    } catch (err) { res.status(500).json(err); }
});

app.post("/create-payment", upload.single("logo"), async (req, res) => {
    try {
        const { x, y, width, height, email } = req.body;
        const w = parseInt(width);
        const h = parseInt(height);

        const ocupados = await Space.find({ status: "approved" });
        const choca = ocupados.some(l => !(parseInt(x) + w <= l.x || parseInt(x) >= l.x + l.width || parseInt(y) + h <= l.y || parseInt(y) >= l.y + l.height));

        if (choca) return res.status(400).json({ error: "Espacio ocupado" });

        const space = await Space.create({
            x: parseInt(x), y: parseInt(y), width: w, height: h,
            buyerEmail: email,
            imageUrl: `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`,
            status: "pending"
        });

        const preference = new Preference(client);
        const response = await preference.create({
            body: {
                items: [{ title: `Pixel Mural ${w}x${h}`, unit_price: w * h * 25, quantity: 1, currency_id: "ARS" }],
                metadata: { space_id: space._id.toString() },
                notification_url: `${BASE_URL}/webhook`,
                back_urls: { success: BASE_URL, failure: BASE_URL },
                auto_return: "approved"
            }
        });
        res.json({ init_point: response.init_point });
    } catch (err) { res.status(500).json({ error: err.message }); }
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
        } catch (e) { console.error(e); }
    }
    res.sendStatus(200);
});

mongoose.connect(process.env.MONGO_URI).then(() => {
    app.listen(PORT, () => console.log("🚀 Servidor Online"));
});