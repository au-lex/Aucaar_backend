// controllers/vehicles/vehicleController.ts
import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { CarModel, ICar } from '../../models/vehicles/vehicle_model';
import { uploadBufferToCloudinary, uploadManyToCloudinary } from '../../service/cloudinaryUpload';

interface CarQuery {
  brand?: string;
  condition?: string;
  minPrice?: string;
  maxPrice?: string;
  storeVerified?: string;
  isFavorite?: string;
  isTopDeal?: string;
  search?: string;
  sortBy?: string;
  order?: string;
  page?: string;
  limit?: string;
}

type MulterFiles = { [field: string]: Express.Multer.File[] };

// Fields that are derived server-side (from completed-order reviews) and must
// never be settable directly through the car create/update endpoints.
const DERIVED_FIELDS = ['rating', 'reviewCount'] as const;

// ---------- Helpers ----------
const isValidObjectId = (id: unknown): id is string =>
  typeof id === 'string' && Types.ObjectId.isValid(id);

const stripDerivedFields = (body: Record<string, any>) => {
  for (const field of DERIVED_FIELDS) delete body[field];
  return body;
};

// Pulls uploaded files off req.files (from upload.fields(...)) and swaps the
// matching body keys for their Cloudinary URLs. Mutates and returns body.
const applyUploadedImages = async (req: Request, body: Record<string, any>) => {
  const files = req.files as MulterFiles | undefined;
  if (!files) return body;

  if (files.imagePath?.[0]) {
    body.imagePath = await uploadBufferToCloudinary(files.imagePath[0].buffer, 'aucaar/cars');
  }
  if (files.positionImages?.length) {
    body.positionImages = await uploadManyToCloudinary(files.positionImages, 'aucaar/cars/positions');
  }
  if (files.galleryImages?.length) {
    body.galleryImages = await uploadManyToCloudinary(files.galleryImages, 'aucaar/cars/gallery');
  }

  // availableColors arrives as a JSON string or comma-list over multipart/form-data
  if (typeof body.availableColors === 'string') {
    try {
      body.availableColors = JSON.parse(body.availableColors);
    } catch {
      body.availableColors = body.availableColors.split(',').map((c: string) => c.trim());
    }
  }

  return body;
};

// ---------- CREATE ----------
export const createCar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = stripDerivedFields({ ...req.body });
    await applyUploadedImages(req, body);
    const car = await CarModel.create(body);
    return res.status(201).json({ success: true, data: car });
  } catch (err: any) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
};

// ---------- GET ALL (with filters, search, sort, pagination) ----------
export const getCars = async (
  req: Request<{}, {}, {}, CarQuery>,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      brand,
      condition,
      minPrice,
      maxPrice,
      storeVerified,
      isFavorite,
      isTopDeal,
      search,
      sortBy = 'createdAt',
      order = 'desc',
      page = '1',
      limit = '20',
    } = req.query;

    const match: Record<string, any> = {};

    if (brand) match.brand = new RegExp(`^${brand}$`, 'i');
    if (condition) match.condition = condition;
    if (storeVerified !== undefined) match.storeVerified = storeVerified === 'true';
    if (isFavorite !== undefined) match.isFavorite = isFavorite === 'true';
    if (isTopDeal !== undefined) match.isTopDeal = isTopDeal === 'true';

    if (search) {
      match.$or = [
        { name: new RegExp(search, 'i') },
        { brand: new RegExp(search, 'i') },
        { storeName: new RegExp(search, 'i') },
      ];
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;
    const sortOrder = order === 'asc' ? 1 : -1;

    const allowedSortFields = new Set([
      'createdAt',
      'updatedAt',
      'name',
      'brand',
      'rating',
      'reviewCount',
      'priceValue',
    ]);
    const sortField = allowedSortFields.has(sortBy) ? sortBy : 'createdAt';

    const pipeline: any[] = [
      {
        $addFields: {
          priceValue: {
            $convert: {
              input: {
                $replaceAll: {
                  input: {
                    $replaceAll: {
                      input: '$price',
                      find: ',',
                      replacement: '',
                    },
                  },
                  find: { $literal: '$' },
                  replacement: '',
                },
              },
              to: 'double',
              onError: 0,
              onNull: 0,
            },
          },
        },
      },
      { $match: match },
    ];

    if (minPrice || maxPrice) {
      const priceMatch: Record<string, number> = {};
      if (minPrice) priceMatch.$gte = parseFloat(minPrice);
      if (maxPrice) priceMatch.$lte = parseFloat(maxPrice);
      pipeline.push({ $match: { priceValue: priceMatch } });
    }

    pipeline.push({
      $facet: {
        data: [
          { $sort: { [sortField]: sortOrder } },
          { $skip: skip },
          { $limit: limitNum },
        ],
        totalCount: [{ $count: 'count' }],
      },
    });

    const result = await CarModel.aggregate(pipeline);

    const cars = result[0]?.data ?? [];
    const total = result[0]?.totalCount?.[0]?.count ?? 0;

    return res.status(200).json({
      success: true,
      data: cars,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------- GET ONE ----------
export const getCarById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid car id' });
    }

    const car = await CarModel.findById(id);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    return res.status(200).json({ success: true, data: car });
  } catch (err) {
    next(err);
  }
};

// ---------- UPDATE ----------
export const updateCar = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid car id' });
    }

    const body = stripDerivedFields({ ...req.body });
    await applyUploadedImages(req, body);

    const car = await CarModel.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    return res.status(200).json({ success: true, data: car });
  } catch (err: any) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
};

// ---------- DELETE ----------
export const deleteCar = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid car id' });
    }

    const car = await CarModel.findByIdAndDelete(id);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    return res.status(200).json({ success: true, message: 'Car deleted' });
  } catch (err) {
    next(err);
  }
};

// ---------- TOGGLE FAVORITE ----------
export const toggleFavorite = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid car id' });
    }

    const car = await CarModel.findById(id);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    car.isFavorite = !car.isFavorite;
    await car.save();

    return res.status(200).json({ success: true, data: car });
  } catch (err) {
    next(err);
  }
};

// ---------- GET FAVORITES ----------
export const getFavorites = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cars = await CarModel.find({ isFavorite: true }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: cars });
  } catch (err) {
    next(err);
  }
};

// ---------- TOGGLE TOP DEAL ----------
export const toggleTopDeal = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid car id' });
    }

    const car = await CarModel.findById(id);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    car.isTopDeal = !car.isTopDeal;
    await car.save();

    return res.status(200).json({ success: true, data: car });
  } catch (err) {
    next(err);
  }
};

// ---------- GET TOP DEALS ----------
export const getTopDeals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cars = await CarModel.find({ isTopDeal: true }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: cars });
  } catch (err) {
    next(err);
  }
};

// ---------- GET DISTINCT BRANDS ----------
export const getBrands = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brands = await CarModel.distinct('brand');
    return res.status(200).json({ success: true, data: brands });
  } catch (err) {
    next(err);
  }
};