
import express from "express";
import { verifierFirebaseToken } from "../middleware/authFirebase.js";
// À ajouter uniquement si la recherche doit être réservée
// aux médecins déjà autorisés :
// import { verifierMedecin } from "../middleware/verifierMedecin.js";

const router = express.Router();

const ESANTE_API_URL =
    "https://gateway.api.esante.gouv.fr/fhir/v2/Practitioner";

router.get(
    "/practitioners",
    verifierFirebaseToken,
    // verifierMedecin, // décommente si nécessaire
    async (req, res) => {
        try {
            
            const apiKey = process.env.ESANTE_API_KEY;

            if (!apiKey) {
                console.error("ESANTE_API_KEY manquante sur Render");

                return res.status(500).json({
                    success: false,
                    error: "Configuration de l'annuaire indisponible."
                });
            }

            const family = String(req.query.family || "").trim();
const given = String(req.query.given || "").trim();

if (family.length < 2 || given.length < 2) {
  return res.status(400).json({
    success: false,
    error: "Veuillez saisir un nom et un prénom."
  });
}

const url = new URL(ESANTE_API_URL);

url.searchParams.set("family", family);
url.searchParams.set("given", given);

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Accept": "application/fhir+json",
                    "ESANTE-API-KEY": apiKey
                },
                signal: AbortSignal.timeout(15000)
            });

            if (!response.ok) {
                console.error(
                    "Erreur API e-Santé :",
                    response.status
                );

                return res.status(502).json({
                    success: false,
                    error: "L'annuaire e-Santé est temporairement indisponible."
                });
            }

            const data = await response.json();

            if (data.resourceType !== "Bundle") {
                return res.status(502).json({
                    success: false,
                    error: "Réponse inattendue de l'annuaire e-Santé."
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
    }
);

export default router;
