# actuatorlist

A free, open catalog of rotary actuators for robotics. Compare torque, mass, speed, backlash and price with links to the original sources.

**[Browse actuators](https://actuatorlist.com/actuators)** · **[Compare specs](https://actuatorlist.com/compare)** · **[Explore robot joints](https://actuatorlist.com/robots)** · **[See bench tests](https://actuatorlist.com/benchmarks)**

| [CubeMars AK80-9 V3.0 KV100](https://actuatorlist.com/actuators/cubemars-ak80-9) | [RobStride 02](https://actuatorlist.com/actuators/robstride-02) | [Xiaomi CyberGear](https://actuatorlist.com/actuators/xiaomi-cybergear) |
| :---: | :---: | :---: |
| <img src="frontend/public/actuator-images/cubemars-ak80-9.webp" alt="CubeMars AK80-9 actuator" width="180"> | <img src="frontend/public/actuator-images/robstride-02.webp" alt="RobStride 02 actuator" width="180"> | <img src="frontend/public/actuator-images/xiaomi-cybergear.webp" alt="Xiaomi CyberGear actuator" width="180"> |
| **22 Nm peak** · 9 Nm rated · 485 g | **17 Nm peak** · 6 Nm rated · 380 g | **12 Nm peak** · 4 Nm rated · 317 g |

[Compare these three](https://actuatorlist.com/compare?compare=cubemars-ak80-9,robstride-02,xiaomi-cybergear) · Test conditions may vary by manufacturer.

**Sizing a joint?** [Humanoid sizing guide](https://actuatorlist.com/guides/humanoid-robot-actuators) · [Arm holding-torque calculator](https://actuatorlist.com/tools/robot-arm-torque-calculator)

## For agents

| Connect | Read |
| --- | --- |
| [MCP server card](https://actuatorlist.com/.well-known/mcp/server-card.json) · [REST API](https://actuatorlist.com/api) · [OpenAPI](https://actuatorlist.com/openapi.json) | [Agent skill](skills/actuatorlist/SKILL.md) · [llms.txt](https://actuatorlist.com/llms.txt) · [Full catalog text](https://actuatorlist.com/llms-full.txt) |

MCP uses Streamable HTTP. The API and MCP are public and read-only.

```bash
claude mcp add --transport http actuatorlist https://actuatorlist.com/mcp
```

## Contribute

- [Report a data error or suggest a part](https://github.com/Miyamura80/actuatorlist/issues/new). Include a manufacturer page or datasheet.
- [Edit actuator data](frontend/src/data/actuators.json) or [robot data](frontend/src/data/robots.json). Follow the [schema](docs/catalog-schema.md) and use `null` for unknown values.
- [Submit a bench test or contribute code](CONTRIBUTING.md) · [Report a security issue privately](SECURITY.md)

<details>
<summary>Run locally with Bun</summary>

```bash
make setup
uv tool install prek && prek install
(cd frontend && bun install && bun run build)
bun run scripts/serve_frontend.ts  # http://localhost:3000
```

Use `cd frontend && bun run dev` for Vite. Run `make validate_data` for catalog edits and `make ci` before opening a PR. See [logo setup](docs/brand-logos.md) and the [image sync workflow](.github/workflows/fetch-actuator-images.yaml).

</details>

[MIT code](LICENSE) · [CC BY 4.0 data](LICENSE-DATA). Credit “actuatorlist.com (Eito Miyamura)” when reusing the data. Robot joint data credited to Reece O'Mahoney of [UnitZero](https://unitzero.ai).
