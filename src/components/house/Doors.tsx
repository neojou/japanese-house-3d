
import { useCallback, useRef, useState, type RefObject } from "react";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  BUILDING,
  COLORS,
  FLOOR_LEVELS,
  INTERIOR_FLOOR_Y,
  MATERIAL_PRESETS,
  SLIDE_DOORS,
  SWING_DOORS,
  WALLS,
  type Opening,
  type SlideDoorDef,
  type SwingDoorDef,
  type WallSegment,
} from "@/data/dimensions";
import { INTERIOR } from "@/lib/houseMaterials";

const LEAF_T = 0.04;
const FRAME_T = 0.05;
const SLIDE_LEAF_T = 0.028;
const SLIDE_FRAME = 0.028;

/**
 * Clickable interior swing door — quarter-circle open (default 90°).
 * Plan-space geometry (parent house group may mirror X).
 */
function SwingDoor({ def }: { def: SwingDoorDef }) {
  const [open, setOpen] = useState(false);
  const hingeRef = useRef<THREE.Group>(null);
  const angle = useRef(0);
  const openRad = def.openSign * THREE.MathUtils.degToRad(def.openAngleDeg);

  const leafW = Math.abs(def.alongMax - def.alongMin) - 0.02;
  const leafH = def.height - FRAME_T - 0.01;
  const baseY = FLOOR_LEVELS[def.floor ?? "1f"];
  const sillY = baseY + def.sill;

  // Hinge world position on wall centerline
  const hingeAlong = def.hingeAt === "min" ? def.alongMin : def.alongMax;
  // Leaf extends from hinge toward the other end
  const leafDir = def.hingeAt === "min" ? 1 : -1;

  const hingePos: [number, number, number] =
    def.axis === "ew"
      ? [hingeAlong, sillY, def.wallZ]
      : [def.wallX, sillY, hingeAlong];

  /**
   * NS walls: leaf local +X must map to +Z when closed so the leaf fills the
   * wall opening (hinge@min → leaf toward +Z; hinge@max + leafDir-1 → −Z).
   * Three.js R_y(-π/2): (x,0,0) → (0,0,x).
   * Must ADD open angle to baseYaw — never overwrite base with angle alone
   * (that left NS doors closed along world X, off the opening).
   */
  const baseYaw = def.axis === "ns" ? -Math.PI / 2 : 0;

  const onClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setOpen((v) => !v);
  }, []);

  useFrame((_, dt) => {
    const target = open ? openRad : 0;
    angle.current = THREE.MathUtils.damp(angle.current, target, 10, dt);
    if (hingeRef.current) {
      hingeRef.current.rotation.y = baseYaw + angle.current;
    }
  });

  const ptr = {
    onClick,
    onPointerOver: () => {
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      document.body.style.cursor = "auto";
    },
  };

  return (
    <group name={def.id} userData={{ interactable: "door" }}>
      {/* Frame posts — interactable so click frame opens door / skips pointer lock */}
      {def.axis === "ew" ? (
        <>
          <mesh
            position={[def.alongMin + FRAME_T / 2, sillY + def.height / 2, def.wallZ]}
            userData={{ interactable: "door" }}
            {...ptr}
          >
            <boxGeometry args={[FRAME_T, def.height, BUILDING.wallThickness]} />
            <meshStandardMaterial
              color={INTERIOR.accent}
              roughness={MATERIAL_PRESETS.doorFrame.roughness}
              metalness={MATERIAL_PRESETS.doorFrame.metalness}
            />
          </mesh>
          <mesh
            position={[def.alongMax - FRAME_T / 2, sillY + def.height / 2, def.wallZ]}
            userData={{ interactable: "door" }}
            {...ptr}
          >
            <boxGeometry args={[FRAME_T, def.height, BUILDING.wallThickness]} />
            <meshStandardMaterial
              color={INTERIOR.accent}
              roughness={MATERIAL_PRESETS.doorFrame.roughness}
              metalness={MATERIAL_PRESETS.doorFrame.metalness}
            />
          </mesh>
          <mesh
            position={[
              (def.alongMin + def.alongMax) / 2,
              sillY + def.height - FRAME_T / 2,
              def.wallZ,
            ]}
            userData={{ interactable: "door" }}
            {...ptr}
          >
            <boxGeometry
              args={[leafW + 0.02, FRAME_T, BUILDING.wallThickness]}
            />
            <meshStandardMaterial
              color={INTERIOR.accent}
              roughness={MATERIAL_PRESETS.doorFrame.roughness}
              metalness={MATERIAL_PRESETS.doorFrame.metalness}
            />
          </mesh>
        </>
      ) : (
        <>
          <mesh
            position={[def.wallX, sillY + def.height / 2, def.alongMin + FRAME_T / 2]}
            userData={{ interactable: "door" }}
            {...ptr}
          >
            <boxGeometry args={[BUILDING.wallThickness, def.height, FRAME_T]} />
            <meshStandardMaterial
              color={INTERIOR.accent}
              roughness={MATERIAL_PRESETS.doorFrame.roughness}
              metalness={MATERIAL_PRESETS.doorFrame.metalness}
            />
          </mesh>
          <mesh
            position={[def.wallX, sillY + def.height / 2, def.alongMax - FRAME_T / 2]}
            userData={{ interactable: "door" }}
            {...ptr}
          >
            <boxGeometry args={[BUILDING.wallThickness, def.height, FRAME_T]} />
            <meshStandardMaterial
              color={INTERIOR.accent}
              roughness={MATERIAL_PRESETS.doorFrame.roughness}
              metalness={MATERIAL_PRESETS.doorFrame.metalness}
            />
          </mesh>
          <mesh
            position={[
              def.wallX,
              sillY + def.height - FRAME_T / 2,
              (def.alongMin + def.alongMax) / 2,
            ]}
            userData={{ interactable: "door" }}
            {...ptr}
          >
            <boxGeometry
              args={[BUILDING.wallThickness, FRAME_T, leafW + 0.02]}
            />
            <meshStandardMaterial
              color={INTERIOR.accent}
              roughness={MATERIAL_PRESETS.doorFrame.roughness}
              metalness={MATERIAL_PRESETS.doorFrame.metalness}
            />
          </mesh>
        </>
      )}

      <group
        ref={hingeRef}
        position={hingePos}
        rotation={[0, baseYaw, 0]}
        userData={{ interactable: "door" }}
      >
        <mesh
          position={[(leafDir * leafW) / 2, leafH / 2, 0]}
          castShadow
          receiveShadow
          userData={{ interactable: "door" }}
          {...ptr}
        >
          <boxGeometry args={[leafW, leafH, LEAF_T]} />
          <meshStandardMaterial
            color={COLORS.genkanDoor}
            roughness={MATERIAL_PRESETS.doorWood.roughness}
            metalness={MATERIAL_PRESETS.doorWood.metalness}
          />
        </mesh>
        {/* Handle near free edge */}
        <mesh
          position={[leafDir * leafW * 0.85, leafH * 0.45, LEAF_T / 2 + 0.015]}
          userData={{ interactable: "door" }}
          {...ptr}
        >
          <boxGeometry args={[0.02, 0.12, 0.03]} />
          <meshStandardMaterial
            color="#b8b8b8"
            metalness={MATERIAL_PRESETS.handle.metalness}
            roughness={MATERIAL_PRESETS.handle.roughness}
          />
        </mesh>
      </group>
    </group>
  );
}

/** Fixed glass window in a wall opening */
function WindowPanel({
  wall,
  opening,
}: {
  wall: WallSegment;
  opening: Opening;
}) {
  const alongX = wall.lengthX >= wall.lengthZ;
  const startCoord = alongX
    ? wall.x - wall.lengthX / 2
    : wall.z - wall.lengthZ / 2;
  const mid = startCoord + opening.fromStart + opening.width / 2;
  const baseY = FLOOR_LEVELS[wall.floor];
  const sill = opening.sill ?? INTERIOR_FLOOR_Y;
  const y = baseY + sill + opening.height / 2;
  const t = 0.03;
  const x = alongX ? mid : wall.x;
  const z = alongX ? wall.z : mid;
  const sizeX = alongX ? opening.width * 0.88 : t;
  const sizeZ = alongX ? t : opening.width * 0.88;
  const frost = opening.glazing === "frosted";
  const frame = 0.028;
  const frameDeep = BUILDING.wallThickness * 1.08;

  return (
    <group>
      <mesh position={[x, y, z]}>
        <boxGeometry args={[sizeX, opening.height * 0.88, sizeZ]} />
        <meshStandardMaterial
          color={frost ? "#d8e0e4" : COLORS.glass}
          transparent
          opacity={frost ? 0.72 : MATERIAL_PRESETS.glass.opacity}
          roughness={frost ? 0.88 : MATERIAL_PRESETS.glass.roughness}
          metalness={frost ? 0.04 : MATERIAL_PRESETS.glass.metalness}
        />
      </mesh>
      {/* Slim charcoal frame (four sides) */}
      {(
        [
          alongX
            ? [opening.width, frame, frameDeep]
            : [frameDeep, frame, opening.width],
          alongX
            ? [opening.width, frame, frameDeep]
            : [frameDeep, frame, opening.width],
          alongX
            ? [frame, opening.height, frameDeep]
            : [frameDeep, opening.height, frame],
          alongX
            ? [frame, opening.height, frameDeep]
            : [frameDeep, opening.height, frame],
        ] as [number, number, number][]
      ).map((args, i) => {
        const dy =
          i === 0
            ? opening.height / 2 - frame / 2
            : i === 1
              ? -(opening.height / 2 - frame / 2)
              : 0;
        const dAlong =
          i === 2
            ? -(opening.width / 2 - frame / 2)
            : i === 3
              ? opening.width / 2 - frame / 2
              : 0;
        return (
          <mesh
            key={`frm-${i}`}
            position={[
              alongX ? x + dAlong : x,
              y + dy,
              alongX ? z : z + dAlong,
            ]}
          >
            <boxGeometry args={args} />
            <meshStandardMaterial
              color="#3a3632"
              roughness={0.55}
              metalness={0.2}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/**
 * Tokonoma-card sliding shower / pocket door.
 * Leaves translate along the wall (no quarter-arc into the room).
 * Dual bypass: both panels stack toward openToward when open.
 */
function SlideDoor({ def }: { def: SlideDoorDef }) {
  const [open, setOpen] = useState(false);
  const tRef = useRef(0); // 0 closed → 1 open
  const leafA = useRef<THREE.Group>(null);
  const leafB = useRef<THREE.Group>(null);

  const openingW = Math.abs(def.alongMax - def.alongMin);
  const n = def.panels;
  const overlap = 0.04;
  const leafW =
    n === 2 ? (openingW + overlap) / 2 + 0.01 : openingW - 0.02;
  const leafH = def.height - 0.04;
  const baseY = FLOOR_LEVELS[def.floor ?? "1f"];
  const sillY = baseY + def.sill;
  const dir = def.openToward === "min" ? -1 : 1;

  // Closed centers along wall
  const closedA =
    n === 2
      ? def.alongMin + leafW / 2 - overlap * 0.25
      : (def.alongMin + def.alongMax) / 2;
  const closedB =
    n === 2
      ? def.alongMax - leafW / 2 + overlap * 0.25
      : closedA;

  // Open: stack west of opening (for openToward min)
  // Lead leaf (B, was east) travels farther; trail leaf (A) parks just west of opening
  const openTravelA = leafW * 0.88;
  const openTravelB = leafW * 0.88 + leafW * 0.72;

  const frameColor = def.frameColor ?? INTERIOR.accent;
  const glassColor = def.glassColor ?? "#f2ebe0";
  const glassOpacity = def.glassOpacity ?? 0.42;

  // Track offset: dual on parallel rails slightly toward UB (−Z for ew wall)
  const railOffA = def.axis === "ew" ? 0.012 : 0;
  const railOffB = def.axis === "ew" ? -0.018 : 0;

  const onClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setOpen((v) => !v);
  }, []);

  useFrame((_, dt) => {
    const target = open ? 1 : 0;
    tRef.current = THREE.MathUtils.damp(tRef.current, target, 8, dt);
    const t = tRef.current;
    if (leafA.current) {
      const along = closedA + dir * openTravelA * t;
      if (def.axis === "ew") {
        leafA.current.position.x = along;
        leafA.current.position.z = def.wallZ + railOffA;
      } else {
        leafA.current.position.z = along;
        leafA.current.position.x = def.wallX + railOffA;
      }
    }
    if (leafB.current && n === 2) {
      const along = closedB + dir * openTravelB * t;
      if (def.axis === "ew") {
        leafB.current.position.x = along;
        leafB.current.position.z = def.wallZ + railOffB;
      } else {
        leafB.current.position.z = along;
        leafB.current.position.x = def.wallX + railOffB;
      }
    }
  });

  const ptr = {
    onClick,
    onPointerOver: () => {
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      document.body.style.cursor = "auto";
    },
  };

  const midAlong = (def.alongMin + def.alongMax) / 2;
  const topY = sillY + def.height;
  const midY = sillY + def.height / 2;

  const post = (along: number, key: string) => {
    const pos: [number, number, number] =
      def.axis === "ew"
        ? [along, midY, def.wallZ]
        : [def.wallX, midY, along];
    const size: [number, number, number] =
      def.axis === "ew"
        ? [SLIDE_FRAME, def.height, BUILDING.wallThickness * 0.95]
        : [BUILDING.wallThickness * 0.95, def.height, SLIDE_FRAME];
    return (
      <mesh key={key} position={pos} userData={{ interactable: "door" }} {...ptr}>
        <boxGeometry args={size} />
        <meshStandardMaterial color={frameColor} roughness={0.55} metalness={0.25} />
      </mesh>
    );
  };

  const leaf = (
    groupRef: RefObject<THREE.Group | null>,
    along0: number,
    zOff: number,
    key: string,
  ) => {
    const pos: [number, number, number] =
      def.axis === "ew"
        ? [along0, sillY + 0.02, def.wallZ + zOff]
        : [def.wallX + zOff, sillY + 0.02, along0];
    return (
      <group
        key={key}
        ref={groupRef}
        position={pos}
        userData={{ interactable: "door" }}
      >
        {/* Glass pane */}
        <mesh
          position={[0, leafH / 2, 0]}
          castShadow
          userData={{ interactable: "door" }}
          {...ptr}
        >
          <boxGeometry
            args={
              def.axis === "ew"
                ? [leafW - SLIDE_FRAME * 2, leafH - SLIDE_FRAME * 2, 0.01]
                : [0.01, leafH - SLIDE_FRAME * 2, leafW - SLIDE_FRAME * 2]
            }
          />
          <meshStandardMaterial
            color={glassColor}
            transparent
            opacity={glassOpacity}
            roughness={0.72}
            metalness={0.05}
            depthWrite={false}
          />
        </mesh>
        {/* Frame rails / stiles */}
        {(
          [
            [0, leafH - SLIDE_FRAME / 2, leafW, SLIDE_FRAME],
            [0, SLIDE_FRAME / 2, leafW, SLIDE_FRAME],
            [
              -(leafW / 2 - SLIDE_FRAME / 2),
              leafH / 2,
              SLIDE_FRAME,
              leafH,
            ],
            [
              leafW / 2 - SLIDE_FRAME / 2,
              leafH / 2,
              SLIDE_FRAME,
              leafH,
            ],
          ] as const
        ).map(([lx, ly, sx, sy], i) => (
          <mesh
            key={`${key}-f${i}`}
            position={
              def.axis === "ew"
                ? [lx, ly, 0]
                : [0, ly, lx]
            }
            userData={{ interactable: "door" }}
            {...ptr}
          >
            <boxGeometry
              args={
                def.axis === "ew"
                  ? [sx, sy, SLIDE_LEAF_T]
                  : [SLIDE_LEAF_T, sy, sx]
              }
            />
            <meshStandardMaterial
              color={frameColor}
              roughness={0.5}
              metalness={0.3}
            />
          </mesh>
        ))}
        {/* Vertical handle bar */}
        <mesh
          position={
            def.axis === "ew"
              ? [leafW * 0.28 * (key === "B" ? -1 : 1), leafH * 0.45, SLIDE_LEAF_T * 0.6]
              : [SLIDE_LEAF_T * 0.6, leafH * 0.45, leafW * 0.28]
          }
          userData={{ interactable: "door" }}
          {...ptr}
        >
          <boxGeometry args={[0.012, 0.28, 0.014]} />
          <meshStandardMaterial
            color="#3a3632"
            roughness={0.4}
            metalness={0.45}
          />
        </mesh>
      </group>
    );
  };

  return (
    <group name={def.id} userData={{ interactable: "door" }}>
      {/* Side posts */}
      {post(def.alongMin + SLIDE_FRAME / 2, "post-min")}
      {post(def.alongMax - SLIDE_FRAME / 2, "post-max")}
      {/* Top rail */}
      <mesh
        position={
          def.axis === "ew"
            ? [midAlong, topY - 0.015, def.wallZ]
            : [def.wallX, topY - 0.015, midAlong]
        }
        userData={{ interactable: "door" }}
        {...ptr}
      >
        <boxGeometry
          args={
            def.axis === "ew"
              ? [openingW + 0.06, 0.03, 0.06]
              : [0.06, 0.03, openingW + 0.06]
          }
        />
        <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.28} />
      </mesh>
      {/* Floor track + low threshold */}
      <mesh
        position={
          def.axis === "ew"
            ? [midAlong, sillY + 0.008, def.wallZ]
            : [def.wallX, sillY + 0.008, midAlong]
        }
        receiveShadow
      >
        <boxGeometry
          args={
            def.axis === "ew"
              ? [openingW + 0.08, 0.016, 0.055]
              : [0.055, 0.016, openingW + 0.08]
          }
        />
        <meshStandardMaterial color="#3a3632" roughness={0.65} metalness={0.2} />
      </mesh>
      {/* Dual track grooves (visual) */}
      <mesh
        position={
          def.axis === "ew"
            ? [midAlong, sillY + 0.012, def.wallZ + railOffA]
            : [def.wallX + railOffA, sillY + 0.012, midAlong]
        }
      >
        <boxGeometry
          args={
            def.axis === "ew"
              ? [openingW + leafW + 0.15, 0.004, 0.012]
              : [0.012, 0.004, openingW + leafW + 0.15]
          }
        />
        <meshStandardMaterial color="#1a1816" roughness={0.8} />
      </mesh>

      {leaf(leafA, closedA, railOffA, "A")}
      {n === 2 && leaf(leafB, closedB, railOffB, "B")}
    </group>
  );
}

const SKIP_OPENING_IDS = new Set([
  "1f-door-genkan-main", // GenkanEntry
  ...SWING_DOORS.map((d) => d.openingId),
  ...SLIDE_DOORS.map((d) => d.openingId),
]);

export function Doors() {
  const windows: { wall: WallSegment; opening: Opening }[] = [];
  for (const wall of WALLS) {
    for (const opening of wall.openings ?? []) {
      if (opening.type === "window") {
        windows.push({ wall, opening });
      }
    }
  }

  return (
    <group name="doors">
      {SWING_DOORS.map((def) => (
        <SwingDoor key={def.id} def={def} />
      ))}
      {SLIDE_DOORS.map((def) => (
        <SlideDoor key={def.id} def={def} />
      ))}
      {windows.map(({ wall, opening }) => (
        <WindowPanel
          key={`${wall.id}-${opening.id}`}
          wall={wall}
          opening={opening}
        />
      ))}
    </group>
  );
}
