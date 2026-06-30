import {
    // Fitness / workout
    Dumbbell,
    Bike,
    Footprints,
    PersonStanding,
    HeartPulse,
    Activity,
    Flame,
    Trophy,
    Medal,
    Timer,
    Mountain,
    // Health / food / drink
    Heart,
    Brain,
    Bed,
    Moon,
    Sun,
    Pill,
    Stethoscope,
    Smile,
    Droplet,
    Droplets,
    GlassWater,
    Apple,
    Carrot,
    Salad,
    Coffee,
    Utensils,
    Cookie,
    Scissors,
    // Mind / learning / hobbies
    Check,
    CircleCheck,
    Target,
    BookOpen,
    Book,
    GraduationCap,
    Pencil,
    NotebookPen,
    Languages,
    Music,
    Headphones,
    Guitar,
    Palette,
    Camera,
    // Plant / nature
    Sprout,
    Flower,
    Flower2,
    Leaf,
    TreePine,
    TreeDeciduous,
    Trees,
    Shovel,
    CloudRain,
    // Home / chores / pets
    House,
    Bath,
    ShowerHead,
    Trash2,
    WashingMachine,
    Brush,
    Hammer,
    Wrench,
    ShoppingCart,
    Dog,
    Cat,
    PawPrint,
    // Money / work / time
    Wallet,
    PiggyBank,
    DollarSign,
    Briefcase,
    Laptop,
    Code,
    Clock,
    Calendar,
    CheckCheck,
    ListChecks,
    Star,
    Sparkles,
    Zap,
    Sunrise,
    Phone,
    Smartphone,
    Circle,
} from '@lucide/svelte';
import type { LucideIcon } from '@lucide/svelte';

/**
 * Curated icon set for habit / plant / workout tracking. Keys are kebab-case
 * (stored on the activity); values are the Lucide components. Grouped roughly by
 * theme so the picker grid reads in sensible clusters.
 */
export const iconMap: Record<string, LucideIcon> = {
    // Fitness / workout
    dumbbell: Dumbbell,
    bike: Bike,
    footprints: Footprints,
    'person-standing': PersonStanding,
    'heart-pulse': HeartPulse,
    activity: Activity,
    flame: Flame,
    trophy: Trophy,
    medal: Medal,
    timer: Timer,
    mountain: Mountain,
    // Health / food / drink
    heart: Heart,
    brain: Brain,
    bed: Bed,
    moon: Moon,
    sun: Sun,
    pill: Pill,
    stethoscope: Stethoscope,
    smile: Smile,
    droplet: Droplet,
    droplets: Droplets,
    'glass-water': GlassWater,
    apple: Apple,
    carrot: Carrot,
    salad: Salad,
    coffee: Coffee,
    utensils: Utensils,
    cookie: Cookie,
    scissors: Scissors,
    // Mind / learning / hobbies
    check: Check,
    'circle-check': CircleCheck,
    target: Target,
    'book-open': BookOpen,
    book: Book,
    'graduation-cap': GraduationCap,
    pencil: Pencil,
    'notebook-pen': NotebookPen,
    languages: Languages,
    music: Music,
    headphones: Headphones,
    guitar: Guitar,
    palette: Palette,
    camera: Camera,
    // Plant / nature
    sprout: Sprout,
    flower: Flower,
    'flower-2': Flower2,
    leaf: Leaf,
    'tree-pine': TreePine,
    'tree-deciduous': TreeDeciduous,
    trees: Trees,
    shovel: Shovel,
    'cloud-rain': CloudRain,
    // Home / chores / pets
    home: House,
    bath: Bath,
    'shower-head': ShowerHead,
    'trash-2': Trash2,
    'washing-machine': WashingMachine,
    brush: Brush,
    hammer: Hammer,
    wrench: Wrench,
    'shopping-cart': ShoppingCart,
    dog: Dog,
    cat: Cat,
    'paw-print': PawPrint,
    // Money / work / time
    wallet: Wallet,
    'piggy-bank': PiggyBank,
    'dollar-sign': DollarSign,
    briefcase: Briefcase,
    laptop: Laptop,
    code: Code,
    clock: Clock,
    calendar: Calendar,
    'check-check': CheckCheck,
    'list-checks': ListChecks,
    star: Star,
    sparkles: Sparkles,
    zap: Zap,
    sunrise: Sunrise,
    phone: Phone,
    smartphone: Smartphone,
    circle: Circle,
};

export const iconNames = Object.keys(iconMap);

/** The original per-type glyphs, used when an activity has no custom icon. */
const TYPE_DEFAULT_ICON: Record<string, string> = {
    habit: 'check',
    plant: 'sprout',
    workout: 'dumbbell',
};

/** Resolve a stored icon name to its component, falling back to a neutral circle. */
export function getIconComponent(iconName: string | null | undefined): LucideIcon {
    return (iconName && iconMap[iconName]) || Circle;
}

/**
 * Icon for an activity: a real custom pick wins, otherwise the type's default
 * glyph. Treats the neutral 'circle' as "unset" so legacy rows (and the schema
 * default) fall back to plant/dumbbell/check instead of a bare circle.
 */
export function getActivityIcon(icon: string | null | undefined, type: string): LucideIcon {
    if (icon && icon !== 'circle' && iconMap[icon]) {
        return iconMap[icon];
    }
    return iconMap[TYPE_DEFAULT_ICON[type]] ?? Circle;
}
