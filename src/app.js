const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Connexion à MongoDB
let db;
const client = new MongoClient(process.env.MONGODB_URI);

async function connectDB() {
  try {
    await client.connect();
    db = client.db(process.env.DB_NAME || 'gamesdb');
    console.log(' Connecté à MongoDB Atlas - Base:', db.databaseName);
  } catch (error) {
    console.error(' Erreur de connexion MongoDB:', error);
    process.exit(1);
  }
}

// Route de base
app.get('/', (req, res) => {
  res.json({ 
    message: " API Jeux Vidéo MongoDB est en ligne !",
    endpoints: {
      "GET /items": "Liste tous les jeux",
      "GET /items/:id": "Récupère un jeu par ID",
      "POST /items": "Crée un nouveau jeu",
      "GET /search": "Recherche de jeux"
    }
  });
});

// ======================
// ROUTES CRUD
// ======================

// GET /items - Liste tous les jeux
app.get('/items', async (req, res) => {
  try {
    const games = await db.collection('games').find({}).toArray();
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /items/:id - Récupère un jeu par ID
// GET /items/:id - Récupère un jeu par ID
app.get('/items/:id', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "ID invalide" });
    }

    const game = await db.collection('games').findOne({
      _id: new ObjectId(req.params.id)
    });
   
    if (!game) {
      return res.status(404).json({ message: "Jeu non trouvé" });
    }
   
    res.json(game);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /items - Crée un nouveau jeu
app.post('/items', async (req, res) => {
  try {
    const newGame = req.body;
    const result = await db.collection('games').insertOne(newGame);
    
    res.status(201).json({
      message: "Jeu créé avec succès",
      id: result.insertedId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /seed - Insère des jeux de test
app.post('/seed', async (req, res) => {
  try {
    const gamesTest = [
      {
        titre: "The Legend of Zelda: Breath of the Wild",
        description: "Un open-world révolutionnaire dans l'univers Zelda",
        genre: "Aventure",
        plateforme: "Nintendo Switch",
        année_sortie: 2017,
        note: 9.8,
        développeur: "Nintendo"
      },
      {
        titre: "Elden Ring",
        description: "Action-RPG sombre et difficile créé par FromSoftware",
        genre: "Action-RPG",
        plateforme: "PC, PS5, Xbox",
        année_sortie: 2022,
        note: 9.5,
        développeur: "FromSoftware"
      },
      {
        titre: "Super Mario Odyssey",
        description: "Mario explore des royaumes en 3D",
        genre: "Plateforme",
        plateforme: "Nintendo Switch",
        année_sortie: 2017,
        note: 9.7,
        développeur: "Nintendo"
      }
    ];

    await db.collection('games').deleteMany({}); // Supprime les anciens jeux de test
    const result = await db.collection('games').insertMany(gamesTest);

    res.json({
      message: "Données de test insérées avec succès",
      count: result.insertedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ======================
// RECHERCHE 
// ======================

// GET /search?keyword=...&genre=... 
app.get('/search', async (req, res) => {
  try {
    const { keyword, genre } = req.query;

    let filter = {};

    // Recherche sur titre ou description (insensible à la casse)
    if (keyword) {
      filter.$or = [
        { titre: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
    }

    // Filtre additionnel par genre
    if (genre) {
      filter.genre = genre;
    }

    const games = await db.collection('games').find(filter).toArray();

    res.json({
      results: games,
      count: games.length,
      keyword: keyword || null,
      genre: genre || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ======================
// Lancement du serveur
// ======================

app.listen(PORT, async () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  await connectDB();
});