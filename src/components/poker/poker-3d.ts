import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Card, ChipDenom } from '@/engine/types';
import { calculateChipBreakdown } from '@/engine/constants';

export interface Player3DPosition {
    x: number;
    z: number;
    betX: number;
    betZ: number;
    stackX: number;
    stackZ: number;
    rotY: number;
    badgeX: number;
    badgeZ: number;
}

export const PLAYER_POSITIONS: Player3DPosition[] = [
    { x: 0, z: 6.5, betX: -1.0, betZ: 3.2, stackX: 2.5, stackZ: 5.5, rotY: 0, badgeX: 0, badgeZ: 14 },
    { x: -8.8, z: 0, betX: -4.5, betZ: -1.0, stackX: -7.5, stackZ: -2.5, rotY: Math.PI / 2, badgeX: -15, badgeZ: 0 },
    { x: 0, z: -6.5, betX: 1.0, betZ: -3.2, stackX: -2.5, stackZ: -5.5, rotY: Math.PI, badgeX: 0, badgeZ: -9.5 },
    { x: 8.8, z: 0, betX: 4.5, betZ: 1.0, stackX: 7.5, stackZ: 2.5, rotY: -Math.PI / 2, badgeX: 15, badgeZ: 0 }
];

interface ActiveAnimation {
    update: (now: number) => boolean;
}

interface Player3DObjects {
    handGroup: THREE.Group | null;
    meshCards: THREE.Group[];
    chipStackMeshes: THREE.Mesh[];
    betMeshes: THREE.Mesh[];
}

export class Poker3DScene {
    private container: HTMLElement;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    private animations: ActiveAnimation[] = [];
    private animationFrameId: number | null = null;
    private isDestroyed: boolean = false;

    private cardBackTexture: THREE.CanvasTexture;
    private chipTextureCache: Record<number, THREE.CanvasTexture> = {};

    private playerObjects: Player3DObjects[] = [
        { handGroup: null, meshCards: [], chipStackMeshes: [], betMeshes: [] },
        { handGroup: null, meshCards: [], chipStackMeshes: [], betMeshes: [] },
        { handGroup: null, meshCards: [], chipStackMeshes: [], betMeshes: [] },
        { handGroup: null, meshCards: [], chipStackMeshes: [], betMeshes: [] }
    ];

    private communityMeshes: THREE.Group[] = [];
    private potChipsMeshes: THREE.Mesh[] = [];

    private onHUDUpdate?: (coords: { id: number; x: number; y: number }[]) => void;

    constructor(container: HTMLElement, onHUDUpdate?: (coords: { id: number; x: number; y: number }[]) => void) {
        this.container = container;
        this.onHUDUpdate = onHUDUpdate;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x05070a);

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 18, 16);
        this.scene.add(this.camera);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 0, 0);
        this.controls.enableDamping = true;
        this.controls.maxPolarAngle = Math.PI / 2.2;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 25;
        this.controls.touches = {
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN
        };

        // Adjust camera responsively for initial screen size
        this.updateCameraResponsive();

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
        this.scene.add(ambientLight);

        const mainSpotLight = new THREE.SpotLight(0xfff8e7, 0.8);
        mainSpotLight.position.set(0, 24, 0);
        mainSpotLight.angle = Math.PI / 2.5;
        mainSpotLight.penumbra = 0.5;
        mainSpotLight.castShadow = true;
        mainSpotLight.shadow.mapSize.width = 2048;
        mainSpotLight.shadow.mapSize.height = 2048;
        this.scene.add(mainSpotLight);

        // Textures
        this.cardBackTexture = this.createCardTexture(null);

        // Build Table
        this.buildTable();

        // Bind Resize
        window.addEventListener('resize', this.onResize);

        // Start render loop
        this.animate = this.animate.bind(this);
        this.animationFrameId = requestAnimationFrame(this.animate);
    }

    public updateCameraResponsive(): void {
        if (!this.camera || !this.renderer) return;

        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspect = width / height;

        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        if (aspect < 1.0) {
            // Mobile portrait & vertical tablet
            const t = THREE.MathUtils.clamp((1.0 - aspect) / 0.55, 0, 1);
            const camY = THREE.MathUtils.lerp(22, 27, t);
            const camZ = THREE.MathUtils.lerp(18, 21, t);
            const fov = THREE.MathUtils.lerp(50, 64, t);

            this.camera.position.set(0, camY, camZ);
            this.camera.fov = fov;
            if (this.controls) {
                this.controls.minDistance = 14;
                this.controls.maxDistance = 45;
            }

            const humanHand = this.playerObjects[0]?.handGroup;
            if (humanHand && humanHand.parent === this.camera) {
                const cardY = THREE.MathUtils.lerp(-2.8, -2.3, t);
                const cardZ = THREE.MathUtils.lerp(-7.8, -6.8, t);
                humanHand.position.set(0, cardY, cardZ);
            }
        } else if (aspect < 1.5) {
            // Square / iPad landscape
            const t = THREE.MathUtils.clamp((1.5 - aspect) / 0.5, 0, 1);
            const camY = THREE.MathUtils.lerp(18, 22, t);
            const camZ = THREE.MathUtils.lerp(16, 18, t);
            const fov = THREE.MathUtils.lerp(45, 50, t);

            this.camera.position.set(0, camY, camZ);
            this.camera.fov = fov;
            if (this.controls) {
                this.controls.minDistance = 10;
                this.controls.maxDistance = 35;
            }

            const humanHand = this.playerObjects[0]?.handGroup;
            if (humanHand && humanHand.parent === this.camera) {
                humanHand.position.set(0, -3.0, -7.8);
            }
        } else {
            // Standard desktop
            this.camera.position.set(0, 18, 16);
            this.camera.fov = 45;
            if (this.controls) {
                this.controls.minDistance = 10;
                this.controls.maxDistance = 25;
            }

            const humanHand = this.playerObjects[0]?.handGroup;
            if (humanHand && humanHand.parent === this.camera) {
                humanHand.position.set(0, -3.2, -8.0);
            }
        }

        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
    }

    private onResize = (): void => {
        this.updateCameraResponsive();
    };

    private generateFeltTexture(): THREE.CanvasTexture {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#14532d';
            ctx.fillRect(0, 0, 512, 512);

            for (let i = 0; i < 30000; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.025)';
                ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
            }
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        return texture;
    }

    private buildTable(): void {
        const tableGroup = new THREE.Group();

        const feltTex = this.generateFeltTexture();
        const feltGeo = new THREE.CylinderGeometry(11, 11, 0.3, 64);
        const feltMat = new THREE.MeshStandardMaterial({ map: feltTex, roughness: 0.95, metalness: 0.0 });
        const feltMesh = new THREE.Mesh(feltGeo, feltMat);
        feltMesh.scale.set(1.15, 1, 0.75);
        feltMesh.receiveShadow = true;
        tableGroup.add(feltMesh);

        const railGeo = new THREE.CylinderGeometry(11.8, 11.8, 0.5, 64);
        const railMat = new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.5, metalness: 0.1 });
        const railMesh = new THREE.Mesh(railGeo, railMat);
        railMesh.scale.set(1.15, 1, 0.75);
        railMesh.position.y = -0.05;
        railMesh.receiveShadow = true;
        tableGroup.add(railMesh);

        this.scene.add(tableGroup);
    }

    private createCardTexture(cardData: Card | null): THREE.CanvasTexture {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 384;
        const ctx = canvas.getContext('2d');
        if (!ctx) return new THREE.CanvasTexture(canvas);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 256, 384);
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#cbd5e1';
        ctx.strokeRect(6, 6, 244, 372);

        if (cardData) {
            ctx.fillStyle = cardData.color;
            ctx.font = 'bold 44px sans-serif';
            ctx.fillText(cardData.value, 18, 54);
            ctx.fillText(cardData.suit, 18, 100);

            ctx.save();
            ctx.translate(256, 384);
            ctx.rotate(Math.PI);
            ctx.fillText(cardData.value, 18, 54);
            ctx.fillText(cardData.suit, 18, 100);
            ctx.restore();

            ctx.font = '100px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cardData.suit, 128, 192);
        } else {
            ctx.fillStyle = '#1e3a8a';
            ctx.fillRect(10, 10, 236, 364);
            ctx.fillStyle = '#3b82f6';
            for (let i = 20; i < 230; i += 20) {
                for (let j = 20; j < 360; j += 20) {
                    if ((i + j) % 40 === 0) ctx.fillRect(i, j, 10, 10);
                }
            }
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.strokeRect(16, 16, 224, 352);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        return texture;
    }

    private createCardMesh(cardData: Card): THREE.Group {
        const cardGroup = new THREE.Group();
        const geo = new THREE.BoxGeometry(1.4, 0.03, 2.0);

        const faceTex = this.createCardTexture(cardData);

        const matSide = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.9, metalness: 0 });
        const matFace = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.9, metalness: 0 });
        const matBack = new THREE.MeshStandardMaterial({ map: this.cardBackTexture, roughness: 0.9, metalness: 0 });

        const materials = [matSide, matSide, matFace, matBack, matSide, matSide];
        const mesh = new THREE.Mesh(geo, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        cardGroup.add(mesh);
        return cardGroup;
    }

    private getChipTextures(denom: ChipDenom): THREE.CanvasTexture {
        if (this.chipTextureCache[denom.value]) return this.chipTextureCache[denom.value];

        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (!ctx) return new THREE.CanvasTexture(canvas);

        ctx.fillStyle = denom.color;
        ctx.beginPath();
        ctx.arc(128, 128, 120, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 12;
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            ctx.beginPath();
            ctx.arc(128, 128, 110, angle - 0.15, angle + 0.15);
            ctx.stroke();
        }

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(128, 128, 70, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = denom.color;
        ctx.beginPath();
        ctx.arc(128, 128, 62, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 44px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`$${denom.label}`, 128, 128);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        this.chipTextureCache[denom.value] = texture;
        return texture;
    }

    private createChipMesh(denom: ChipDenom): THREE.Mesh {
        const geo = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 32);
        const topBottomTex = this.getChipTextures(denom);

        const matSide = new THREE.MeshStandardMaterial({ color: denom.hex, roughness: 0.5, metalness: 0.1 });
        const matTopBottom = new THREE.MeshStandardMaterial({ map: topBottomTex, roughness: 0.5, metalness: 0.1 });

        const mesh = new THREE.Mesh(geo, [matSide, matTopBottom, matTopBottom]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    public animateObjectTo(
        obj: THREE.Object3D,
        targetPos: THREE.Vector3,
        targetRot: { x: number; y: number; z: number },
        duration = 500,
        onComplete: (() => void) | null = null
    ): void {
        const startPos = obj.position.clone();
        const startRot = { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z };
        const startTime = performance.now();

        this.animations.push({
            update: (now: number) => {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const ease = 1 - Math.pow(1 - progress, 3);

                obj.position.lerpVectors(startPos, targetPos, ease);
                obj.rotation.x = startRot.x + (targetRot.x - startRot.x) * ease;
                obj.rotation.y = startRot.y + (targetRot.y - startRot.y) * ease;
                obj.rotation.z = startRot.z + (targetRot.z - startRot.z) * ease;

                if (progress >= 1) {
                    if (onComplete) onComplete();
                    return true;
                }
                return false;
            }
        });
    }

    public resetRound3D(): void {
        this.playerObjects.forEach((pObj) => {
            if (pObj.handGroup) {
                if (pObj.handGroup.parent) {
                    pObj.handGroup.parent.remove(pObj.handGroup);
                }
                pObj.handGroup = null;
            }
            pObj.meshCards = [];
        });

        this.communityMeshes.forEach((m) => this.scene.remove(m));
        this.communityMeshes = [];
    }

    public dealInitial3DCards(
        players: { id: number; hand: Card[]; folded: boolean; isHuman: boolean }[],
        communityCards: Card[]
    ): void {
        this.resetRound3D();

        players.forEach((p, i) => {
            if (p.folded) return;

            const handGroup = new THREE.Group();
            this.playerObjects[i].handGroup = handGroup;

            if (p.isHuman) {
                const aspect = window.innerWidth / window.innerHeight;
                let cardY = -3.2;
                let cardZ = -8.0;
                if (aspect < 1.0) {
                    const t = THREE.MathUtils.clamp((1.0 - aspect) / 0.55, 0, 1);
                    cardY = THREE.MathUtils.lerp(-2.8, -2.3, t);
                    cardZ = THREE.MathUtils.lerp(-7.8, -6.8, t);
                } else if (aspect < 1.5) {
                    cardY = -3.0;
                    cardZ = -7.8;
                }
                handGroup.position.set(0, cardY, cardZ);
                this.camera.add(handGroup);

                p.hand.forEach((cardData, cIdx) => {
                    const cardMesh = this.createCardMesh(cardData);
                    const offsetX = cIdx === 0 ? -0.8 : 0.8;
                    const rotZ = cIdx === 0 ? 0.08 : -0.08;

                    cardMesh.position.set(offsetX, 0, 0);
                    cardMesh.rotation.set(Math.PI / 2 - 0.15, 0, rotZ);

                    handGroup.add(cardMesh);
                    this.playerObjects[i].meshCards.push(cardMesh);
                });
            } else {
                const pos = PLAYER_POSITIONS[i];
                handGroup.position.set(pos.x, 0.22, pos.z);
                handGroup.rotation.y = pos.rotY;
                this.scene.add(handGroup);

                p.hand.forEach((cardData, cIdx) => {
                    const cardMesh = this.createCardMesh(cardData);
                    const offsetX = cIdx === 0 ? -0.75 : 0.75;

                    cardMesh.position.set(offsetX, 0, 0);
                    cardMesh.rotation.set(Math.PI, 0, 0);

                    handGroup.add(cardMesh);
                    this.playerObjects[i].meshCards.push(cardMesh);
                });
            }
        });

        for (let i = 0; i < communityCards.length; i++) {
            const cardData = communityCards[i];
            const cardMesh = this.createCardMesh(cardData);
            const targetX = -3.2 + i * 1.6;
            cardMesh.position.set(targetX, 0.22, 0);
            cardMesh.rotation.set(Math.PI, 0, 0);
            this.scene.add(cardMesh);
            this.communityMeshes.push(cardMesh);
        }
    }

    public revealCommunityCards(startIndex: number, count: number): void {
        for (let i = 0; i < count; i++) {
            const idx = startIndex + i;
            const mesh = this.communityMeshes[idx];
            if (mesh) {
                this.animateObjectTo(mesh, mesh.position, { x: 0, y: 0, z: 0 }, 500);
            }
        }
    }

    public animateFold(playerIdx: number, isHuman: boolean): void {
        const pObj = this.playerObjects[playerIdx];
        if (!pObj.handGroup) return;

        if (isHuman) {
            // Detach from camera and attach to scene so cards live in world space on the table felt
            if (pObj.handGroup.parent === this.camera) {
                this.scene.attach(pObj.handGroup);
            }

            // Animate handGroup down to the table felt in front of the player
            const targetTablePos = new THREE.Vector3(0, 0.22, 4.4);
            this.animateObjectTo(
                pObj.handGroup,
                targetTablePos,
                { x: 0, y: 0, z: 0 },
                500
            );

            // Lay cards flat on table felt, face-up and slightly fanned
            pObj.meshCards.forEach((cardMesh, cIdx) => {
                const offsetX = cIdx === 0 ? -0.75 : 0.75;
                const rotY = cIdx === 0 ? 0.12 : -0.12;
                this.animateObjectTo(
                    cardMesh,
                    new THREE.Vector3(offsetX, cIdx * 0.01, 0),
                    { x: 0, y: rotY, z: 0 },
                    500
                );
            });
        } else {
            this.animateObjectTo(
                pObj.handGroup,
                new THREE.Vector3(0, 0.1, 0),
                { x: pObj.handGroup.rotation.x, y: pObj.handGroup.rotation.y, z: pObj.handGroup.rotation.z },
                400,
                () => {
                    if (pObj.handGroup && pObj.handGroup.parent) {
                        pObj.handGroup.parent.remove(pObj.handGroup);
                    }
                    pObj.handGroup = null;
                }
            );
        }
    }

    public revealBotCardsForShowdown(activePlayerIds: number[]): void {
        activePlayerIds.forEach((id) => {
            if (id !== 0) {
                const pObj = this.playerObjects[id];
                if (pObj.handGroup) {
                    pObj.meshCards.forEach((m) => {
                        this.animateObjectTo(m, m.position, { x: 0, y: 0, z: 0 }, 500);
                    });
                }
            }
        });
    }

    public renderPlayer3DChips(playerIdx: number, chips: number, currentBet: number): void {
        const pObj = this.playerObjects[playerIdx];

        pObj.chipStackMeshes.forEach((m) => this.scene.remove(m));
        pObj.chipStackMeshes = [];
        pObj.betMeshes.forEach((m) => this.scene.remove(m));
        pObj.betMeshes = [];

        const pPos = PLAYER_POSITIONS[playerIdx];
        const cos = Math.cos(pPos.rotY);
        const sin = Math.sin(pPos.rotY);

        if (chips > 0) {
            const breakdown = calculateChipBreakdown(chips);
            let stackCol = 0;

            breakdown.forEach(({ denom, count }) => {
                const numStacks = Math.ceil(count / 10);
                let chipsLeft = count;

                for (let s = 0; s < numStacks; s++) {
                    const stackHeight = Math.min(chipsLeft, 10);
                    for (let h = 0; h < stackHeight; h++) {
                        const chip = this.createChipMesh(denom);

                        const localX = (stackCol % 3) * 0.8;
                        const localZ = Math.floor(stackCol / 3) * 0.8;
                        const finalOffsetX = localX * cos - localZ * sin;
                        const finalOffsetZ = localX * sin + localZ * cos;

                        chip.position.set(
                            pPos.stackX + finalOffsetX,
                            0.2 + h * 0.085,
                            pPos.stackZ + finalOffsetZ
                        );
                        this.scene.add(chip);
                        pObj.chipStackMeshes.push(chip);
                    }
                    chipsLeft -= stackHeight;
                    stackCol++;
                }
            });
        }

        if (currentBet > 0) {
            const breakdown = calculateChipBreakdown(currentBet);
            let betCol = 0;

            breakdown.forEach(({ denom, count }) => {
                const stackHeight = Math.min(count, 5);
                for (let h = 0; h < stackHeight; h++) {
                    const chip = this.createChipMesh(denom);

                    const localX = betCol * 0.8;
                    const finalOffsetX = localX * cos;
                    const finalOffsetZ = localX * sin;

                    chip.position.set(
                        pPos.betX + finalOffsetX,
                        0.2 + h * 0.085,
                        pPos.betZ + finalOffsetZ
                    );
                    this.scene.add(chip);
                    pObj.betMeshes.push(chip);
                }
                betCol++;
            });
        }
    }

    public renderPot3DChips(amount: number): void {
        this.potChipsMeshes.forEach((m) => this.scene.remove(m));
        this.potChipsMeshes = [];

        if (amount <= 0) return;

        const breakdown = calculateChipBreakdown(amount);
        let col = 0;

        breakdown.forEach(({ denom, count }) => {
            const stackHeight = Math.min(count, 6);
            for (let h = 0; h < stackHeight; h++) {
                const chip = this.createChipMesh(denom);
                const colX = -1.2 + col * 0.8;
                chip.position.set(colX, 0.2 + h * 0.085, 0);
                this.scene.add(chip);
                this.potChipsMeshes.push(chip);
            }
            col++;
        });
    }

    private updateHUDPositions(): void {
        if (!this.onHUDUpdate) return;
        const tempV = new THREE.Vector3();
        const width = window.innerWidth;
        const height = window.innerHeight;
        const isMobile = width < 768;
        const paddingX = isMobile ? 38 : 70;
        const paddingY = isMobile ? 45 : 70;

        const coords: { id: number; x: number; y: number }[] = [];

        PLAYER_POSITIONS.forEach((pos, i) => {
            if (i === 0) return; // Player 0 (Human) is handled via CSS/controls

            let bx = pos.badgeX;
            let bz = pos.badgeZ;

            if (isMobile) {
                if (i === 1) { // Bot 1 (Left)
                    bx = -7.8;
                    bz = -2.2;
                } else if (i === 3) { // Bot 3 (Right)
                    bx = 7.8;
                    bz = -2.2;
                } else if (i === 2) { // Bot 2 (Top)
                    bx = 0;
                    bz = -8.8;
                }
            }

            tempV.set(bx, 1.2, bz);
            tempV.project(this.camera);

            let x = (tempV.x * 0.5 + 0.5) * width;
            let y = (tempV.y * -0.5 + 0.5) * height;

            x = Math.max(paddingX, Math.min(width - paddingX, x));
            y = Math.max(paddingY, Math.min(height - paddingY, y));

            // Prevent badges from overlapping the top-center pot display
            const centerX = width / 2;
            const potHalfWidth = isMobile ? 110 : 150;
            const safeTop = isMobile ? 95 : 150;

            if (Math.abs(x - centerX) < potHalfWidth && y < safeTop) {
                y = safeTop;
            }

            // On mobile, prevent badges from overlapping the bottom controls dock
            if (isMobile) {
                const bottomControlsHeight = 160;
                if (y > height - bottomControlsHeight) {
                    y = height - bottomControlsHeight;
                }
            }

            coords.push({ id: i, x, y });
        });

        this.onHUDUpdate(coords);
    }

    private animate(now: number): void {
        if (this.isDestroyed) return;

        this.animationFrameId = requestAnimationFrame(this.animate);

        for (let i = this.animations.length - 1; i >= 0; i--) {
            if (this.animations[i].update(now)) {
                this.animations.splice(i, 1);
            }
        }

        this.controls.update();
        this.updateHUDPositions();
        this.renderer.render(this.scene, this.camera);
    }

    public destroy(): void {
        this.isDestroyed = true;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
        }
        window.removeEventListener('resize', this.onResize);

        this.controls.dispose();
        this.renderer.dispose();

        if (this.renderer.domElement && this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
    }
}
