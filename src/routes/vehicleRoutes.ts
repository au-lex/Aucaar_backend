// routes/vehicleRoutes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { upload } from '../middleware/upload';
import {
  createCar,
  getCars,
  getCarById,
  updateCar,
  deleteCar,
  toggleFavorite,
  getFavorites,
  toggleTopDeal,
  getTopDeals,
  getBrands,
  getCarsByBrand,
} from '../controllers/vehicles/vehicleController';

const router = Router();

const carImageFields = upload.fields([
  { name: 'imagePath', maxCount: 1 },
  { name: 'positionImages', maxCount: 10 },
  { name: 'galleryImages', maxCount: 10 },
]);

const handleCarUploads = (req: Request, res: Response, next: NextFunction) => {
  carImageFields(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'File upload failed' });
    }
    next();
  });
};

router.get('/brands', getBrands);
router.get('/brand/:brand', getCarsByBrand);
router.get('/favorites', getFavorites);
router.get('/top-deals', getTopDeals);

router.post('/', handleCarUploads, createCar);
router.get('/', getCars);
router.get('/:id', getCarById);
router.patch('/:id', handleCarUploads, updateCar);
router.delete('/:id', deleteCar);
router.patch('/:id/favorite', toggleFavorite);
router.patch('/:id/top-deal', toggleTopDeal);

export default router;