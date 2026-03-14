const TOPIC_KEYWORDS: Record<string, string[]> = {
  integration: ["integral", "integrate", "antiderivative", "∫", "definite integral", "indefinite integral", "substitution method", "by parts"],
  differentiation: ["derivative", "differentiate", "dy/dx", "d/dx", "chain rule", "product rule", "quotient rule", "implicit differentiation", "tangent slope"],
  kinematics: ["velocity", "acceleration", "displacement", "projectile", "motion", "speed", "distance", "time", "uniformly", "trajectory", "free fall"],
  "organic-chemistry": ["organic", "functional group", "alkane", "alkene", "alkyne", "benzene", "isomer", "reaction mechanism", "ester", "aldehyde", "ketone", "amine", "polymer", "nucleophilic", "electrophilic"],
  thermodynamics: ["entropy", "enthalpy", "gibbs", "heat", "work done", "internal energy", "isothermal", "adiabatic", "carnot", "thermodynamic", "specific heat", "latent heat"],
  probability: ["probability", "permutation", "combination", "bayes", "random variable", "distribution", "expected value", "binomial", "poisson", "normal distribution", "sample space", "event"]
};

export function inferTopic(text: string): string {
  const lower = text.toLowerCase();

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return topic;
    }
  }

  return "general";
}
