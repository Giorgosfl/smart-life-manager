export interface TuyaDevice {
  id: string;
  name: string;
  uid: string;
  local_key: string;
  category: string;
  product_id: string;
  product_name: string;
  sub: boolean;
  uuid: string;
  online: boolean;
  active_time: number;
  create_time: number;
  update_time: number;
  status: TuyaDeviceStatus[];
  icon: string;
  ip: string;
  time_zone: string;
}

export interface TuyaDeviceStatus {
  code: string;
  value: boolean | string | number;
}

export interface TuyaDeviceFunction {
  code: string;
  desc: string;
  name: string;
  type: string;
  values: string;
}

export interface TuyaScene {
  scene_id: string;
  name: string;
  status: string;
  actions: TuyaSceneAction[];
  enabled: boolean;
}

export interface TuyaSceneAction {
  entity_id: string;
  action_executor: string;
  executor_property: Record<string, unknown>;
}

export interface TuyaAutomation {
  id: string;
  name: string;
  status: string;
  enabled: boolean;
  conditions: TuyaAutomationCondition[];
  actions: TuyaSceneAction[];
  match_type: number;
}

export interface TuyaAutomationCondition {
  entity_id: string;
  entity_type: number;
  order_num?: number;
  display: {
    code: string;
    operator: string;
    value: boolean | string | number;
  };
}

export interface TuyaTimer {
  id: string;
  timer_id?: string;
  loops: string;
  time: string;
  status: number;
  functions: { code: string; value: boolean | string | number }[];
}

export interface TuyaHome {
  home_id: number;
  name: string;
}

export interface TuyaRoom {
  room_id: number;
  name: string;
  devices: string[]; // device IDs in this room
}

export interface MirrorButton {
  device_id: string;
  button_code: string;
  label: string;
}

export interface MirrorGroup {
  id: string;
  name: string;
  main: MirrorButton;
  mirrors: MirrorButton[];
  automation_ids: string[];
}

export interface MirrorGroupsData {
  groups: MirrorGroup[];
}

export interface CreateAutomationBody {
  name: string;
  conditions: TuyaAutomationCondition[];
  actions: TuyaSceneAction[];
  match_type: number;
}

export interface CreateSceneBody {
  name: string;
  actions: TuyaSceneAction[];
}

export interface CreateTimerBody {
  loops: string;
  time: string;
  functions: { code: string; value: boolean | string | number }[];
}
