"use client"
import {Select, SelectItem} from "@heroui/select";
import { useCookies } from 'react-cookie';
import { housesList } from '@/app/lib/data';

export const HouseSelect = () => {
  const setCookie = useCookies(['house'])[1];

  const items = housesList().map(houseAndSheedId => 
    <SelectItem key={"P" + houseAndSheedId[0]}>P{houseAndSheedId[0]}</SelectItem>
  );
  
  function houseSelected(house: string) {
    setCookie('house', house, { path: '/' })
    location.reload();
  }

  return (
    <div className="grid gap-4 inline-block text-center justify-center">
      <Select 
        className="max-w-xs min-w-40" 
        label="Vælg hus" 
        isRequired
        labelPlacement="outside"
        name="house"
        placeholder="Vælg hus"
        onChange={(selectedOption) => houseSelected(selectedOption.target.value)}
      >
        {items}
      </Select>
    </div>
)};
