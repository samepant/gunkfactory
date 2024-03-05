import { MeasurementCategory } from ".";
import { GunkUnits } from "../garments/garment";

export type Measurement = {
  name: string;
  description: string;
  category: MeasurementCategory;
  bookId: number;
  referenceImage: string;
  value?: number;
};

export type Sloper = {
  unit: GunkUnits;
  measurements: Measurements;
};

export type Measurements = {
  // Upper Body
  shoulderGirth: Measurement;
  chestGirth: Measurement;
  abdomenGirth: Measurement;
  waistGirth: Measurement;
  shoulderSeam: Measurement;
  halfFrontNeckline: Measurement;
  centerFrontNeckToShoulderTip: Measurement;
  halfFrontToMidArmhole: Measurement;
  halfFrontChest: Measurement;
  halfFrontAbdomen: Measurement;
  halfFrontWaist: Measurement;
  halfBackNeckline: Measurement;
  centerBackNeckToShoulderTip: Measurement;
  halfBackToMidArmhole: Measurement;
  halfBackChest: Measurement;
  halfBackAbdomen: Measurement;
  halfBackWaist: Measurement;
  dartPlacement: Measurement;
  sideSeam: Measurement;
  highNeckToSideSeamFront: Measurement;
  highNeckToSideSeamBack: Measurement;
  centerFront: Measurement;
  fullFront: Measurement;
  highNeckToChestFront: Measurement;
  shoulderTipToCenterWaistFront: Measurement;
  centerBack: Measurement;
  fullBack: Measurement;
  shoulderTipToCenterWaistBack: Measurement;

  // Arm
  armLength: Measurement;
  underArmLength: Measurement;
  forearmLength: Measurement;
  bicepGirth: Measurement;
  elbowGirth: Measurement;
  wristGirth: Measurement;
  handGirth: Measurement;

  // Lower Body
  hipGirth: Measurement;
  hipHeightFront: Measurement;
  hipHeightSide: Measurement;
  hipHeightBack: Measurement;
  halfFrontHip: Measurement;
  halfBackHip: Measurement;
  outseamToFloor: Measurement;
  inseamToFloor: Measurement;
  crotchDepth: Measurement;
  outseamToAnkle: Measurement;
  inseamToAnkle: Measurement;
  crotchLength: Measurement;
  thighGirth: Measurement;
  calfGirth: Measurement;
  waistToKnee: Measurement;
  kneeToAnkle: Measurement;
  ankleGirth: Measurement;
  footGirth: Measurement;
};
