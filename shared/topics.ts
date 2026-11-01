import type { Topic } from "./types";
const units: [string, string[], string][] = [
  [
    "Electrostatics",
    [
      "Electric charges & forces",
      "Electric field",
      "Electric dipole",
      "Electric flux",
      "Gauss’s law",
      "Electric potential",
      "Potential energy",
      "Equipotential surfaces",
      "Capacitance",
      "Dielectrics",
    ],
    "⚡",
  ],
  [
    "Current Electricity",
    [
      "Electric current",
      "Drift velocity",
      "Ohm’s law",
      "Resistivity",
      "Series & parallel circuits",
      "EMF & internal resistance",
      "Kirchhoff’s laws",
      "Wheatstone bridge",
      "Metre bridge",
      "Potentiometer",
    ],
    "⌁",
  ],
  [
    "Ray Optics",
    [
      "Reflection of light",
      "Spherical mirrors",
      "Refraction",
      "Total internal reflection",
      "Prisms",
      "Thin lenses",
      "Lens combinations",
      "Optical instruments",
      "Human eye",
      "Dispersion",
    ],
    "◈",
  ],
];
export const topics: Topic[] = units.flatMap(([unit, names, icon], u) =>
  names.map((name, i) => ({
    id: `${u + 1}-${i + 1}`,
    name,
    unit,
    icon,
    description: `Build your understanding of ${name.toLowerCase()} with focused practice.`,
  })),
);
export const demoTopics = ["1-1", "2-3", "3-6"];
