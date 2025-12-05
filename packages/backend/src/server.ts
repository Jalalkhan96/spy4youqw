import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import targetRoutes from './routes/targets';

dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api', targetRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
