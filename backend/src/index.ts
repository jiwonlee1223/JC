import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import journeyRouter from './routes/journey.js';
import journeyStreamRouter from './routes/journey-stream.js';

// 환경 변수 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// 라우트
app.use('/api/journeys', journeyRouter);
app.use('/api/journeys', journeyStreamRouter);

// 헬스 체크
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`Journey Creator API server is running on port ${PORT}`);
});
