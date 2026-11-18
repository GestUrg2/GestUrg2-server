import express from "express";

const router = express.Router();

const ESANTE_API_URL =
    "https://gateway.api.esante.gouv.fr/fhir/v2/Practitioner";

router.get("/practitioners", async (req, res) => {
    try {
        const nom = String(req.query.name || "").trim();

        if (nom.length < 2) {
            return res.status(400).json({
                success: false,
                error: "Saisissez au moins 2 caractères."
            });
        }

        const apiKey = process.env.ESANTE_API_KEY;

        if (!apiKey) {
            console.error("ESANTE_API_KEY absente des variables d'environnement.");

            return res.status(500).json({
                success: false,
                error: "Configuration de l'API e-Santé manquante."
            });
        }

        const url = new URL(ESANTE_API_URL);
        url.searchParams.set("name", nom);

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/fhir+json",
                "ESANTE-API-KEY": apiKey
            },
            signal: AbortSignal.timeout(15000)
        });

        const texte = await response.text();

        if (!response.ok) {
            console.error(
                "Erreur API e-Santé :",
                response.status,
                texte.slice(0, 500)
            );

            return res.status(502).json({
                success: false,
                error: "L'annuaire e-Santé est temporairement indisponible."
            });
        }

        let data;

        try {
            data = JSON.parse(texte);
        } catch {
            return res.status(502).json({
                success: false,
                error: "Réponse invalide de l'annuaire e-Santé."
            });
        }

        if (data.resourceType !== "Bundle") {
            return res.status(502).json({
                success: false,
                error: "Format de réponse FHIR inattendu."
            });
        }

        return res.json({
            success: true,
            total: data.total ?? data.entry?.length ?? 0,
            entry: data.entry || []
        });

    } catch (error) {
        console.error("Erreur recherche e-Santé :", error);

        return res.status(500).json({
            success: false,
            error: "Impossible d'effectuer la recherche."
        });
    }
});

export default router;