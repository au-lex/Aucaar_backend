
import { Router } from 'express';
import {
  createCar,
  getCars,
  getCarById,
  updateCar,
  deleteCar,
  toggleFavorite,
  getFavorites,
  getBrands,
} from '../controllers/vehicles/vehicleController';

const router = Router();


router.get('/brands', getBrands);
router.get('/favorites', getFavorites);

router.post('/', createCar);
router.get('/', getCars);
router.get('/:id', getCarById);
router.patch('/:id', updateCar);
router.delete('/:id', deleteCar);
router.patch('/:id/favorite', toggleFavorite);

export default router;