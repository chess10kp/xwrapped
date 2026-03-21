export interface PageData {
  uuid: string;
  handle: string;
}

export function load({ params }: { params: { uuid: string } }): PageData {
  return {
    uuid: params.uuid,
    handle: '',
  };
}
