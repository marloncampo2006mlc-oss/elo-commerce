import { Router } from 'express';
import { dashboardController } from './dashboard.controller.js';

export const dashboardRoutes = Router();
dashboardRoutes.get('/', dashboardController.resumo);
