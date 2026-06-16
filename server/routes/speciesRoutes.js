const express = require("express");
const router = express.Router();
const { loadTaxonomy, searchTaxonomy } = require("../services/taxonomyService");

router.get("/species", async (req, res) => {
  const q = (req.query.q || "").trim();

  if (q.length < 2) {
    return res.json([]);
  }

  let taxonomy;
  try {
    taxonomy = await loadTaxonomy();
  } catch (err) {
    console.error("[Species route] Taxonomy unavailable:", err.message);
    return res.status(503).json({
      error:
        "Species taxonomy is temporarily unavailable. The demo species list is still available.",
    });
  }

  const results = searchTaxonomy(taxonomy, q);
  return res.json(results);
});

module.exports = router;
